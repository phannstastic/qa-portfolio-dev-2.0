import { describe, expect, it } from 'bun:test';
import { createServer } from '../../src/index';
import { users, errorScenes } from '../../src/db';
import { signAuthToken } from '../../src/utils/jwt';
import { extractYouTubeVideoId } from '../../src/routes/admin';
import { DEFAULT_ERROR_SCENE } from '../../src/routes/public';
import { MySqlDialect } from 'drizzle-orm/mysql-core';
import { readFileSync } from 'fs';
import { join } from 'path';

const dialect = new MySqlDialect();

const MOCK_ADMIN_USER = {
  id: 1,
  name: 'Admin User',
  email: 'admin@irfanlab.dev',
  role: 'admin',
};

const MOCK_VIEWER_USER = {
  id: 2,
  name: 'Viewer',
  email: 'viewer@irfanlab.dev',
  role: 'user',
};

function evaluateCondition(row: any, condition: any): boolean {
  if (!condition) return true;
  const { sql, params } = dialect.sqlToQuery(condition);

  if (sql.includes('`users`.`id` = ?')) {
    return row.id === Number(params[0]);
  }
  if (sql.includes('`error_scenes`.`is_active` = ?')) {
    const activeVal = params.find((p: any) => typeof p === 'boolean');
    if (activeVal !== undefined && Boolean(row.isActive) !== Boolean(activeVal)) {
      return false;
    }
  }
  if (sql.includes('`error_scenes`.`id` = ?')) {
    return row.id === Number(params[0]);
  }
  return true;
}

function createMockDb(initialScenes: any[] = [{ ...DEFAULT_ERROR_SCENE, id: 1 }]) {
  const userList = [{ ...MOCK_ADMIN_USER }, { ...MOCK_VIEWER_USER }];
  const sceneList = initialScenes ? [...initialScenes] : [];
  let nextId = 10;

  const getTableData = (table: any) => {
    const tableName = table?.[Symbol.for('drizzle:Name')] || (typeof table?.name === 'string' ? table.name : '');
    if (table === users || tableName === 'users') return userList;
    if (table === errorScenes || tableName === 'error_scenes') return sceneList;
    return [];
  };

  return {
    select: (_fields?: any) => ({
      from: (table: any) => {
        const target = getTableData(table);
        let filtered = [...target];
        let limitCount: number | null = null;

        const queryObj = {
          where: (condition: any) => {
            filtered = filtered.filter((row) => evaluateCondition(row, condition));
            return queryObj;
          },
          orderBy: (..._cols: any[]) => queryObj,
          limit: (n: number) => {
            limitCount = n;
            return queryObj;
          },
          then: (resolve: (val: any) => void) => {
            const res = limitCount !== null ? filtered.slice(0, limitCount) : filtered;
            resolve(res);
          },
        };
        return queryObj;
      },
    }),

    insert: (table: any) => ({
      values: async (data: any) => {
        nextId++;
        const target = getTableData(table);
        const newRecord = {
          id: nextId,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        target.push(newRecord);
        return [{ insertId: nextId }];
      },
    }),

    update: (table: any) => ({
      set: (updateData: any) => ({
        where: async (condition: any) => {
          const target = getTableData(table);
          for (let i = 0; i < target.length; i++) {
            if (evaluateCondition(target[i], condition)) {
              target[i] = { ...target[i], ...updateData, updatedAt: new Date() };
            }
          }
          return [{ affectedRows: 1 }];
        },
      }),
    }),
  };
}

describe('404 Music Scene Feature & Admin Management', () => {
  describe('YouTube Video ID Extractor', () => {
    it('extracts ID from standard watch URL', () => {
      expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=RZO9lVz2v8I')).toBe('RZO9lVz2v8I');
    });

    it('extracts ID from short youtu.be URL', () => {
      expect(extractYouTubeVideoId('https://youtu.be/RZO9lVz2v8I')).toBe('RZO9lVz2v8I');
    });

    it('extracts ID from embed URL', () => {
      expect(extractYouTubeVideoId('https://www.youtube.com/embed/RZO9lVz2v8I')).toBe('RZO9lVz2v8I');
    });

    it('extracts ID from YouTube shorts URL', () => {
      expect(extractYouTubeVideoId('https://www.youtube.com/shorts/RZO9lVz2v8I')).toBe('RZO9lVz2v8I');
    });

    it('retains raw 11-character video ID', () => {
      expect(extractYouTubeVideoId('RZO9lVz2v8I')).toBe('RZO9lVz2v8I');
    });
  });

  describe('Public GET /api/error-scene', () => {
    it('returns the active 404 error scene configuration', async () => {
      const mockDb = createMockDb();
      const app = createServer({ db: mockDb, jwtSecret: 'test-secret-key-1234567890' });

      const res = await app.handle(new Request('http://localhost/api/error-scene'));
      expect(res.status).toBe(200);

      const json = (await res.json()) as any;
      expect(json.status).toBe('success');
      expect(json.data.artist).toBe('eaJ');
      expect(json.data.songTitle).toBe('pause');
      expect(json.data.youtubeVideoId).toBe('N2kz9EOtIPQ');
    });

    it('falls back to default scene if database returns empty', async () => {
      const mockDb = createMockDb([]);
      const app = createServer({ db: mockDb, jwtSecret: 'test-secret-key-1234567890' });

      const res = await app.handle(new Request('http://localhost/api/error-scene'));
      expect(res.status).toBe(200);

      const json = (await res.json()) as any;
      expect(json.status).toBe('success');
      expect(json.data.headline).toBe(DEFAULT_ERROR_SCENE.headline);
    });
  });

  describe('Admin GET & PUT /api/admin/error-scene', () => {
    const JWT_SECRET = 'test-secret-key-1234567890';

    it('rejects unauthenticated requests to admin endpoints', async () => {
      const mockDb = createMockDb();
      const app = createServer({ db: mockDb, jwtSecret: JWT_SECRET });

      const getRes = await app.handle(new Request('http://localhost/api/admin/error-scene'));
      expect(getRes.status).toBe(401);

      const putRes = await app.handle(
        new Request('http://localhost/api/admin/error-scene', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ',
            artist: 'Rick Astley',
            songTitle: 'Never Gonna Give You Up',
            lyricQuote: 'Never gonna give you up',
            message: 'A classic lost scene.',
          }),
        })
      );
      expect(putRes.status).toBe(401);
    });

    it('rejects unauthorized non-admin user (role: "user")', async () => {
      const mockDb = createMockDb();
      const app = createServer({ db: mockDb, jwtSecret: JWT_SECRET });
      const viewerToken = await signAuthToken(MOCK_VIEWER_USER, JWT_SECRET);

      const res = await app.handle(
        new Request('http://localhost/api/admin/error-scene', {
          headers: { Authorization: `Bearer ${viewerToken}` },
        })
      );
      expect(res.status).toBe(403);
    });

    it('allows admin to fetch current scene settings', async () => {
      const mockDb = createMockDb();
      const app = createServer({ db: mockDb, jwtSecret: JWT_SECRET });
      const adminToken = await signAuthToken(MOCK_ADMIN_USER, JWT_SECRET);

      const res = await app.handle(
        new Request('http://localhost/api/admin/error-scene', {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(res.status).toBe(200);

      const json = (await res.json()) as any;
      expect(json.status).toBe('success');
      expect(json.data.artist).toBe('eaJ');
    });

    it('allows admin to update the 404 scene with new song details', async () => {
      const mockDb = createMockDb();
      const app = createServer({ db: mockDb, jwtSecret: JWT_SECRET });
      const adminToken = await signAuthToken(MOCK_ADMIN_USER, JWT_SECRET);

      const updatePayload = {
        headline: 'Lost in the Acoustic Realm?',
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        artist: 'Rick Astley',
        songTitle: 'Never Gonna Give You Up',
        lyricQuote: 'Never gonna run around and desert you.',
        message: 'You have ventured into unknown territory, but the music never lets you down.',
        actionHint: 'Click below to return home safely.',
        buttonText: 'Take Me Home',
        buttonUrl: '/',
        isActive: true,
      };

      const putRes = await app.handle(
        new Request('http://localhost/api/admin/error-scene', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatePayload),
        })
      );

      expect(putRes.status).toBe(200);
      const putJson = (await putRes.json()) as any;
      expect(putJson.status).toBe('success');
      expect(putJson.data.artist).toBe('Rick Astley');
      expect(putJson.data.youtubeVideoId).toBe('dQw4w9WgXcQ');
      expect(putJson.data.buttonText).toBe('Take Me Home');

      // Now verify public endpoint receives the updated scene
      const publicRes = await app.handle(new Request('http://localhost/api/error-scene'));
      const publicJson = (await publicRes.json()) as any;
      expect(publicJson.data.artist).toBe('Rick Astley');
      expect(publicJson.data.songTitle).toBe('Never Gonna Give You Up');
      expect(publicJson.data.youtubeVideoId).toBe('dQw4w9WgXcQ');
    });
  });

  describe('Static & Client Assets Integrity', () => {
    it('public/404.html contains dynamic error-scene script and fallback markup', () => {
      const htmlPath = join(process.cwd(), 'public', '404.html');
      const html = readFileSync(htmlPath, 'utf8');

      expect(html).toContain('error-scene-title');
      expect(html).toContain('error-scene-iframe');
      expect(html).toContain('/api/error-scene');
      expect(html).toContain('eaJ');
      expect(html).toContain('pause');
      expect(html).toContain('class="site-header"');
      expect(html).toContain('class="btn-hit-me-up"');
      expect(html).toContain('class="site-footer"');
      expect(html).toContain('class="footer-brand"');
    });

    it('public/admin.html contains 404 scene navigation and editor view', () => {
      const adminPath = join(process.cwd(), 'public', 'admin.html');
      const adminHtml = readFileSync(adminPath, 'utf8');

      expect(adminHtml).toContain('id="nav-error-scene"');
      expect(adminHtml).toContain('id="view-error-scene"');
      expect(adminHtml).toContain('id="error-scene-form"');
      expect(adminHtml).toContain('id="live-preview-iframe"');
      expect(adminHtml).toContain('id="btn-save-error-scene"');
    });

    it('public/js/admin.js handles 404 scene view switching and form handling', () => {
      const jsPath = join(process.cwd(), 'public', 'js', 'admin.js');
      const js = readFileSync(jsPath, 'utf8');

      expect(js).toContain("'error-scene'");
      expect(js).toContain('setupErrorSceneSettings');
      expect(js).toContain('loadErrorSceneSettings');
      expect(js).toContain('/api/admin/error-scene');
    });
  });
});
