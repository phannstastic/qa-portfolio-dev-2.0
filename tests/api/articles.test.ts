import { describe, expect, it } from 'bun:test';
import { createServer } from '../../src/index';
import { users, articles } from '../../src/db';
import { signAuthToken } from '../../src/utils/jwt';
import { MySqlDialect } from 'drizzle-orm/mysql-core';

const dialect = new MySqlDialect();

const MOCK_USERS = [
  { id: 1, name: 'Admin User', email: 'admin@irfanlab.dev', role: 'admin' },
  { id: 2, name: 'Regular Viewer', email: 'viewer@irfanlab.dev', role: 'user' },
];

const MOCK_ARTICLES = [
  {
    id: 1,
    title: 'How to Formulate Bulletproof Bug Reports That Developers Love',
    slug: 'how-to-write-bulletproof-bug-reports',
    category: 'Manual QA',
    tags: 'Bug Reporting, Manual Testing, UAT, Jira',
    readTime: '4 min read',
    excerpt: 'A great bug report is not just an issue ticket—it is an actionable blueprint.',
    content: '# How to Formulate Bulletproof Bug Reports\n\nContent details here...',
    isPublished: true,
    publishedAt: new Date('2026-10-01T00:00:00Z'),
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
  },
  {
    id: 2,
    title: 'REST API Testing Mastery: From Manual Verification to Automated Test Collections',
    slug: 'rest-api-testing-mastery-postman',
    category: 'API Testing',
    tags: 'Postman, REST API, API Automation, Backend',
    readTime: '5 min read',
    excerpt: 'Moving beyond basic 200 OK checks.',
    content: '# REST API Testing Mastery\n\nPostman assertion details...',
    isPublished: true,
    publishedAt: new Date('2026-10-05T00:00:00Z'),
    createdAt: new Date('2026-10-05T00:00:00Z'),
    updatedAt: new Date('2026-10-05T00:00:00Z'),
  },
  {
    id: 3,
    title: 'Draft Article Under Review',
    slug: 'draft-article-under-review',
    category: 'Internal',
    tags: 'Draft, Notes',
    readTime: '2 min read',
    excerpt: 'Internal draft not yet released.',
    content: '# Draft Article\n\nSecret testing methodologies...',
    isPublished: false,
    publishedAt: new Date('2026-10-10T00:00:00Z'),
    createdAt: new Date('2026-10-10T00:00:00Z'),
    updatedAt: new Date('2026-10-10T00:00:00Z'),
  },
];

function evaluateCondition(row: any, condition: any): boolean {
  if (!condition) return true;
  const { sql, params } = dialect.sqlToQuery(condition);

  // User ID check
  if (sql.includes('`users`.`id` = ?')) {
    return row.id === Number(params[0]);
  }

  // Article ID check
  if (sql.includes('`articles`.`id` = ?')) {
    return row.id === Number(params[0]);
  }

  // Article slug check
  if (sql.includes('`articles`.`slug` = ?')) {
    const slugIdx = params.findIndex((p: any) => typeof p === 'string' && !p.includes('%'));
    if (slugIdx !== -1) {
      if (row.slug !== params[slugIdx]) return false;
    }
  }

  // Published filter check
  if (sql.includes('`articles`.`is_published` = ?')) {
    const pubVal = params.find((p: any) => typeof p === 'boolean');
    if (pubVal !== undefined && Boolean(row.isPublished) !== Boolean(pubVal)) {
      return false;
    }
  }

  return true;
}

function createMockArticlesDb(options?: { users?: any[]; articles?: any[] }) {
  const userList = options?.users !== undefined ? [...options.users] : [...MOCK_USERS];
  const articleList = options?.articles !== undefined ? [...options.articles] : [...MOCK_ARTICLES];
  let nextId = 100;

  const getTableData = (table: any) => {
    const tableName = table?.[Symbol.for('drizzle:Name')] || (typeof table?.name === 'string' ? table.name : '');
    if (table === users || tableName === 'users') return userList;
    if (table === articles || tableName === 'articles') return articleList;
    return [];
  };

  return {
    select: (_fields?: any) => ({
      from: (table: any) => {
        const target = getTableData(table);
        const createQuery = () => {
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
        };

        return createQuery();
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
              target[i] = { ...target[i], ...updateData };
            }
          }
          return [{ affectedRows: 1 }];
        },
      }),
    }),
    delete: (table: any) => ({
      where: async (condition: any) => {
        const target = getTableData(table);
        const idx = target.findIndex((item) => evaluateCondition(item, condition));
        if (idx !== -1) target.splice(idx, 1);
        return [{ affectedRows: 1 }];
      },
    }),
  };
}

describe('Articles & Blog Feature Test Suite', async () => {
  const TEST_JWT_SECRET = 'test_articles_jwt_secret_xyz1234567890';
  const adminToken = await signAuthToken(
    { id: 1, email: 'admin@irfanlab.dev', role: 'admin' },
    TEST_JWT_SECRET
  );
  const userToken = await signAuthToken(
    { id: 2, email: 'viewer@irfanlab.dev', role: 'user' },
    TEST_JWT_SECRET
  );

  const mockDb = createMockArticlesDb();
  const app = createServer({
    db: mockDb,
    jwtSecret: TEST_JWT_SECRET,
  });

  describe('Public Articles Endpoints', () => {
    it('GET /api/articles returns 200 OK with success status and list of articles', async () => {
      const res = await app.handle(new Request('http://localhost/api/articles'));
      expect(res.status).toBe(200);

      const body = (await res.json()) as any;
      expect(body.status).toBe('success');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
    });

    it('GET /api/articles/:slug returns 200 OK with matching article data', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/articles/how-to-write-bulletproof-bug-reports')
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.status).toBe('success');
      expect(body.data.title).toBe('How to Formulate Bulletproof Bug Reports That Developers Love');
    });

    it('GET /api/articles/non-existent-article-slug returns 404 error', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/articles/this-slug-definitely-does-not-exist')
      );
      expect(res.status).toBe(404);
      const body = (await res.json()) as any;
      expect(body.status).toBe('error');
      expect(body.message).toContain('Article not found');
    });
  });

  describe('Admin Articles Endpoints (Protected by JWT)', () => {
    it('GET /api/admin/articles rejects unauthenticated requests with 401', async () => {
      const res = await app.handle(new Request('http://localhost/api/admin/articles'));
      expect(res.status).toBe(401);
      const body = (await res.json()) as any;
      expect(body.status).toBe('error');
    });

    it('POST /api/admin/articles rejects requests from non-admin role with 403', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/admin/articles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({
            title: 'Unauthorized Post',
            content: 'Content that should be blocked...',
          }),
        })
      );
      expect(res.status).toBe(403);
    });

    it('POST /api/admin/articles validates payload (rejects title shorter than 3 chars)', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/admin/articles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            title: 'Hi',
            content: 'Short title validation test.',
          }),
        })
      );
      expect(res.status).toBe(400);
    });

    it('POST /api/admin/articles validates payload (rejects content shorter than 10 chars)', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/admin/articles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            title: 'Valid Title Here',
            content: 'Too short',
          }),
        })
      );
      expect(res.status).toBe(400);
    });

    it('POST /api/admin/articles successfully creates article with valid payload', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/admin/articles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            title: 'Automated Katalon UI Testing Case Study',
            content: 'Detailed case study on how Katalon regression tests reduced defect escape rate.',
            category: 'UI Automation',
            readTime: '6 min read',
          }),
        })
      );
      expect(res.status).toBe(201);
      const body = (await res.json()) as any;
      expect(body.status).toBe('success');
      expect(body.data.slug).toBe('automated-katalon-ui-testing-case-study');
    });
  });

  describe('Admin Inline Image Upload Endpoints', () => {
    it('POST /api/admin/upload/image rejects unauthenticated requests with 401', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/admin/upload/image', {
          method: 'POST',
        })
      );
      expect(res.status).toBe(401);
    });

    it('POST /api/admin/upload/image rejects request without file with 400', async () => {
      const formData = new FormData();
      const res = await app.handle(
        new Request('http://localhost/api/admin/upload/image', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
          body: formData,
        })
      );
      expect(res.status).toBe(400);
      const body = (await res.json()) as any;
      expect(body.message).toContain('No image file provided');
    });

    it('POST /api/admin/upload/image uploads image and returns public URL', async () => {
      const formData = new FormData();
      const dummyFile = new File(['fake-png-content-data'], 'test-story-photo.png', {
        type: 'image/png',
      });
      formData.append('file', dummyFile);

      const res = await app.handle(
        new Request('http://localhost/api/admin/upload/image', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
          body: formData,
        })
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.status).toBe('success');
      expect(body.data.url).toContain('/images/articles/');

      // Clean up test file from disk
      if (body.data?.url) {
        const fs = await import('node:fs');
        const path = await import('node:path');
        const filename = body.data.url.split('/').pop();
        if (filename) {
          const filePath = path.resolve(process.cwd(), 'public/images/articles', filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      }
    });
  });

  describe('Blog HTML Page Serving', () => {
    it('GET /blog serves 200 OK with valid HTML and favicon links', async () => {
      const res = await app.handle(new Request('http://localhost/blog'));
      expect(res.status).toBe(200);

      const html = await res.text();
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('irfanLab');
      expect(html).toContain('href="/favicon.svg"');
      expect(html).toContain('href="/favicon-32x32.png"');
    });

    it('GET /blog/:slug serves 200 OK with article reader HTML layout', async () => {
      const res = await app.handle(
        new Request('http://localhost/blog/how-to-write-bulletproof-bug-reports')
      );
      expect(res.status).toBe(200);

      const html = await res.text();
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('article-reader-wrap');
      expect(html).toContain('href="/favicon.svg"');
    });
  });
});
