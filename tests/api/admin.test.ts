import { describe, expect, it } from 'bun:test';
import { createServer } from '../../src/index';
import { signAuthToken } from '../../src/utils/jwt';
import { MySqlDialect } from 'drizzle-orm/mysql-core';
import { users, projects, experiences, contacts } from '../../src/db';

const dialect = new MySqlDialect();
const TEST_SECRET = 'test_jwt_secret_for_admin_tests_1234567890';

function evaluateCondition(row: any, condition: any): boolean {
  if (!condition) return true;
  const { sql, params } = dialect.sqlToQuery(condition);

  // 1. check id: `table`.`id` = ?
  if (
    sql === '`users`.`id` = ?' ||
    sql === '`projects`.`id` = ?' ||
    sql === '`experiences`.`id` = ?' ||
    sql === '`contacts`.`id` = ?'
  ) {
    return row.id === Number(params[0]);
  }

  // 2. check slug: `projects`.`slug` = ?
  if (sql === '`projects`.`slug` = ?') {
    return row.slug === params[0];
  }

  // 3. check collision: (`projects`.`slug` = ? and `projects`.`id` <> ?)
  if (
    sql.includes('`projects`.`slug` = ?') &&
    (sql.includes('`projects`.`id` <> ?') || sql.includes('`projects`.`id` != ?'))
  ) {
    return row.slug === params[0] && row.id !== Number(params[1]);
  }

  // 4. check contacts status: `contacts`.`status` = ?
  if (sql === '`contacts`.`status` = ?') {
    return row.status === params[0];
  }

  return true;
}

function createMockAdminDb(options?: {
  users?: any[];
  projects?: any[];
  experiences?: any[];
  contacts?: any[];
  shouldThrow?: boolean;
}) {
  const shouldThrow = options?.shouldThrow ?? false;
  let nextId = 500;

  const userList = options?.users !== undefined ? [...options.users] : [
    { id: 1, name: 'Super Admin', email: 'admin@qa-portfolio.local', role: 'admin' },
    { id: 2, name: 'Normal User', email: 'user@qa-portfolio.local', role: 'user' },
  ];

  const projectList = options?.projects !== undefined ? [...options.projects] : [
    {
      id: 1,
      title: 'API Testing Framework',
      slug: 'api-testing-framework',
      description: 'Framework for API test automation.',
      category: 'API Testing',
      techStack: 'Bun, ElysiaJS, TypeBox',
      githubUrl: 'https://github.com/example/api-testing',
      liveDemoUrl: null,
      imageUrl: null,
      isFeatured: true,
      sortOrder: 1,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    },
    {
      id: 2,
      title: 'E2E Selenium Automation',
      slug: 'e2e-selenium-automation',
      description: 'End-to-end testing with Selenium.',
      category: 'Automation Testing',
      techStack: 'Selenium, Java',
      githubUrl: null,
      liveDemoUrl: null,
      imageUrl: null,
      isFeatured: false,
      sortOrder: 2,
      createdAt: new Date('2026-01-02T00:00:00Z'),
      updatedAt: new Date('2026-01-02T00:00:00Z'),
    },
  ];

  const expList = options?.experiences !== undefined ? [...options.experiences] : [
    {
      id: 1,
      company: 'Tech Corp',
      role: 'QA Engineer',
      location: 'Remote',
      startDate: '2023-01-15',
      endDate: null,
      isCurrent: true,
      description: 'Automating tests and CI/CD pipelines.',
      sortOrder: 1,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    },
  ];

  const contactList = options?.contacts !== undefined ? [...options.contacts] : [
    {
      id: 1,
      name: 'Alice Wonder',
      email: 'alice@example.com',
      subject: 'Consulting',
      message: 'Looking for a QA automation specialist for our mobile app.',
      status: 'unread',
      createdAt: new Date('2026-01-01T10:00:00Z'),
    },
    {
      id: 2,
      name: 'Bob Builder',
      email: 'bob@example.com',
      subject: 'Collaboration',
      message: 'Would love to discuss potential automation testing tools.',
      status: 'read',
      createdAt: new Date('2026-01-02T10:00:00Z'),
    },
  ];

  const getTableData = (table: any) => {
    const tableName = table?.name || table?.[Symbol.for('drizzle:Name')] || '';
    if (table === users || tableName === 'users') return userList;
    if (table === projects || tableName === 'projects') return projectList;
    if (table === experiences || tableName === 'experiences') return expList;
    if (table === contacts || tableName === 'contacts') return contactList;
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
            orderBy: (..._cols: any[]) => {
              return queryObj;
            },
            limit: (n: number) => {
              limitCount = n;
              return queryObj;
            },
            then: (resolve: (val: any) => void, reject: (err: any) => void) => {
              if (shouldThrow) {
                return reject(new Error('Simulated database error'));
              }
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
        if (shouldThrow) throw new Error('Simulated database error on insert');
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
      set: (data: any) => ({
        where: async (condition: any) => {
          if (shouldThrow) throw new Error('Simulated database error on update');
          const target = getTableData(table);
          for (const row of target) {
            if (evaluateCondition(row, condition)) {
              Object.assign(row, data, { updatedAt: new Date() });
            }
          }
          return [{ affectedRows: 1 }];
        },
      }),
    }),

    delete: (table: any) => ({
      where: async (condition: any) => {
        if (shouldThrow) throw new Error('Simulated database error on delete');
        const target = getTableData(table);
        const idx = target.findIndex((row) => evaluateCondition(row, condition));
        if (idx !== -1) {
          target.splice(idx, 1);
        }
        return [{ affectedRows: idx !== -1 ? 1 : 0 }];
      },
    }),
  };
}

describe('Admin CRUD API Suite (Task 6)', () => {
  // -------------------------------------------------------------
  // 1. Authentication & Role Authorization Middleware
  // -------------------------------------------------------------
  describe('JWT Authentication & Trusted Role Middleware', () => {
    it('returns 401 when request lacks Authorization header', async () => {
      const mockDb = createMockAdminDb();
      const app = createServer({ db: mockDb, jwtSecret: TEST_SECRET });

      const response = await app.handle(new Request('http://localhost/api/admin/projects'));
      expect(response.status).toBe(401);

      const body = (await response.json()) as any;
      expect(body).toEqual({
        status: 'error',
        message: 'Unauthorized: Missing or invalid authorization token',
      });
    });

    it('returns 401 when Authorization header does not use Bearer format', async () => {
      const mockDb = createMockAdminDb();
      const app = createServer({ db: mockDb, jwtSecret: TEST_SECRET });

      const response = await app.handle(
        new Request('http://localhost/api/admin/projects', {
          headers: { Authorization: 'Basic somecredentials' },
        })
      );
      expect(response.status).toBe(401);
    });

    it('returns 401 when token has an invalid signature or malformed payload', async () => {
      const mockDb = createMockAdminDb();
      const app = createServer({ db: mockDb, jwtSecret: TEST_SECRET });

      const response = await app.handle(
        new Request('http://localhost/api/admin/projects', {
          headers: { Authorization: 'Bearer this.is.not.a.valid.jwt.token' },
        })
      );
      expect(response.status).toBe(401);

      const body = (await response.json()) as any;
      expect(body.message).toContain('Unauthorized: Invalid or expired token');
    });

    it('returns 401 when token is expired', async () => {
      const mockDb = createMockAdminDb();
      const expiredToken = await signAuthToken(
        { id: 1, email: 'admin@qa-portfolio.local', role: 'admin' },
        TEST_SECRET,
        '-1s' // Expired 1 second ago
      );
      const app = createServer({ db: mockDb, jwtSecret: TEST_SECRET });

      const response = await app.handle(
        new Request('http://localhost/api/admin/projects', {
          headers: { Authorization: `Bearer ${expiredToken}` },
        })
      );
      expect(response.status).toBe(401);
      const body = (await response.json()) as any;
      expect(body.message).toContain('Unauthorized: Invalid or expired token');
    });

    it('returns 401 when user in token does not exist in the database (revoked/deleted)', async () => {
      const mockDb = createMockAdminDb();
      const unknownUserToken = await signAuthToken(
        { id: 9999, email: 'ghost@qa-portfolio.local', role: 'admin' },
        TEST_SECRET,
        '1h'
      );
      const app = createServer({ db: mockDb, jwtSecret: TEST_SECRET });

      const response = await app.handle(
        new Request('http://localhost/api/admin/projects', {
          headers: { Authorization: `Bearer ${unknownUserToken}` },
        })
      );
      expect(response.status).toBe(401);
      const body = (await response.json()) as any;
      expect(body.message).toBe('Unauthorized: User not found or session revoked');
    });

    it('returns 403 when database role is not authorized (role check does not blindly trust JWT payload)', async () => {
      const mockDb = createMockAdminDb();
      // Even if attacker forged `role: 'superadmin'` in a validly signed token, DB says user 2 is 'user'
      const untrustedToken = await signAuthToken(
        { id: 2, email: 'user@qa-portfolio.local', role: 'superadmin' },
        TEST_SECRET,
        '1h'
      );
      const app = createServer({ db: mockDb, jwtSecret: TEST_SECRET });

      const response = await app.handle(
        new Request('http://localhost/api/admin/projects', {
          headers: { Authorization: `Bearer ${untrustedToken}` },
        })
      );
      expect(response.status).toBe(403);
      const body = (await response.json()) as any;
      expect(body).toEqual({
        status: 'error',
        message: 'Forbidden: Insufficient privileges',
      });
    });

    it('returns 500 when database throws an error during user authorization check', async () => {
      const mockDb = createMockAdminDb({ shouldThrow: true });
      const validToken = await signAuthToken(
        { id: 1, email: 'admin@qa-portfolio.local', role: 'admin' },
        TEST_SECRET,
        '1h'
      );
      const app = createServer({ db: mockDb, jwtSecret: TEST_SECRET });

      const response = await app.handle(
        new Request('http://localhost/api/admin/projects', {
          headers: { Authorization: `Bearer ${validToken}` },
        })
      );
      expect(response.status).toBe(500);
      const body = (await response.json()) as any;
      expect(body.message).toBe('Database error during authorization check');
    });
  });

  // -------------------------------------------------------------
  // 2. Admin Projects CRUD (/api/admin/projects)
  // -------------------------------------------------------------
  describe('Admin Projects CRUD (/api/admin/projects)', () => {
    let adminToken: string;

    it('prepares admin token', async () => {
      adminToken = await signAuthToken(
        { id: 1, email: 'admin@qa-portfolio.local', role: 'admin' },
        TEST_SECRET,
        '1h'
      );
      expect(adminToken).toBeDefined();
    });

    it('GET /api/admin/projects - lists all projects', async () => {
      const mockDb = createMockAdminDb();
      const app = createServer({ db: mockDb, jwtSecret: TEST_SECRET });

      const res = await app.handle(
        new Request('http://localhost/api/admin/projects', {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(res.status).toBe(200);

      const body = (await res.json()) as any;
      expect(body.status).toBe('success');
      expect(body.data).toHaveLength(2);
      expect(body.data[0].slug).toBe('api-testing-framework');
    });

    it('GET /api/admin/projects/:id - retrieves project detail by ID', async () => {
      const mockDb = createMockAdminDb();
      const app = createServer({ db: mockDb, jwtSecret: TEST_SECRET });

      const res = await app.handle(
        new Request('http://localhost/api/admin/projects/1', {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(res.status).toBe(200);

      const body = (await res.json()) as any;
      expect(body.status).toBe('success');
      expect(body.data.id).toBe(1);
      expect(body.data.title).toBe('API Testing Framework');
    });

    it('GET /api/admin/projects/:id - returns 404 when project not found', async () => {
      const mockDb = createMockAdminDb();
      const app = createServer({ db: mockDb, jwtSecret: TEST_SECRET });

      const res = await app.handle(
        new Request('http://localhost/api/admin/projects/999', {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(res.status).toBe(404);

      const body = (await res.json()) as any;
      expect(body).toEqual({
        status: 'error',
        message: 'Project not found',
      });
    });

    it('POST /api/admin/projects - creates a project with auto-generated slug', async () => {
      const mockDb = createMockAdminDb();
      const app = createServer({ db: mockDb, jwtSecret: TEST_SECRET });

      const res = await app.handle(
        new Request('http://localhost/api/admin/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            title: 'Performance Benchmark with k6',
            description: 'Stress testing CMS REST endpoints.',
            category: 'Performance',
            techStack: 'k6, Grafana',
            isFeatured: true,
          }),
        })
      );

      expect(res.status).toBe(201);
      const body = (await res.json()) as any;
      expect(body.status).toBe('success');
      expect(body.message).toBe('Project created successfully');
      expect(body.data.title).toBe('Performance Benchmark with k6');
      expect(body.data.slug).toBe('performance-benchmark-with-k6');
      expect(body.data.isFeatured).toBe(true);
    });

    it('POST /api/admin/projects - returns 409 when slug already exists', async () => {
      const mockDb = createMockAdminDb();
      const app = createServer({ db: mockDb, jwtSecret: TEST_SECRET });

      const res = await app.handle(
        new Request('http://localhost/api/admin/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            title: 'Another API Framework',
            slug: 'api-testing-framework', // Collision with existing project 1
            description: 'Duplicate slug test.',
            category: 'API Testing',
            techStack: 'Bun',
          }),
        })
      );

      expect(res.status).toBe(409);
      const body = (await res.json()) as any;
      expect(body).toEqual({
        status: 'error',
        message: 'A project with this slug already exists',
      });
    });

    it('POST /api/admin/projects - returns 400 when required fields are missing', async () => {
      const mockDb = createMockAdminDb();
      const app = createServer({ db: mockDb, jwtSecret: TEST_SECRET });

      const res = await app.handle(
        new Request('http://localhost/api/admin/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            title: 'Incomplete project',
            // Missing description, category, techStack
          }),
        })
      );

      expect(res.status).toBe(400);
      const body = (await res.json()) as any;
      expect(body.status).toBe('error');
    });

    it('PUT /api/admin/projects/:id - updates an existing project', async () => {
      const mockDb = createMockAdminDb();
      const app = createServer({ db: mockDb, jwtSecret: TEST_SECRET });

      const res = await app.handle(
        new Request('http://localhost/api/admin/projects/1', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            title: 'Updated API Testing Suite',
            isFeatured: false,
          }),
        })
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.status).toBe('success');
      expect(body.message).toBe('Project updated successfully');
      expect(body.data.title).toBe('Updated API Testing Suite');
      expect(body.data.isFeatured).toBe(false);
    });

    it('PUT /api/admin/projects/:id - returns 404 when project to update does not exist', async () => {
      const mockDb = createMockAdminDb();
      const app = createServer({ db: mockDb, jwtSecret: TEST_SECRET });

      const res = await app.handle(
        new Request('http://localhost/api/admin/projects/999', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ title: 'Ghost Project' }),
        })
      );

      expect(res.status).toBe(404);
      const body = (await res.json()) as any;
      expect(body.message).toBe('Project not found');
    });

    it('PUT /api/admin/projects/:id - returns 409 when changing slug to another existing slug', async () => {
      const mockDb = createMockAdminDb();
      const app = createServer({ db: mockDb, jwtSecret: TEST_SECRET });

      const res = await app.handle(
        new Request('http://localhost/api/admin/projects/2', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            slug: 'api-testing-framework', // Owned by project 1
          }),
        })
      );

      expect(res.status).toBe(409);
      const body = (await res.json()) as any;
      expect(body.message).toBe('Another project with this slug already exists');
    });

    it('DELETE /api/admin/projects/:id - deletes project successfully', async () => {
      const mockDb = createMockAdminDb();
      const app = createServer({ db: mockDb, jwtSecret: TEST_SECRET });

      const res = await app.handle(
        new Request('http://localhost/api/admin/projects/1', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body).toEqual({
        status: 'success',
        message: 'Project deleted successfully',
      });

      // Verify it's no longer accessible
      const checkRes = await app.handle(
        new Request('http://localhost/api/admin/projects/1', {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(checkRes.status).toBe(404);
    });

    it('DELETE /api/admin/projects/:id - returns 404 when project does not exist', async () => {
      const mockDb = createMockAdminDb();
      const app = createServer({ db: mockDb, jwtSecret: TEST_SECRET });

      const res = await app.handle(
        new Request('http://localhost/api/admin/projects/999', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );

      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------
  // 3. Admin Experiences CRUD (/api/admin/experiences)
  // -------------------------------------------------------------
  describe('Admin Experiences CRUD (/api/admin/experiences)', () => {
    let adminToken: string;

    it('prepares admin token', async () => {
      adminToken = await signAuthToken(
        { id: 1, email: 'admin@qa-portfolio.local', role: 'admin' },
        TEST_SECRET,
        '1h'
      );
    });

    it('GET /api/admin/experiences - lists all experiences', async () => {
      const mockDb = createMockAdminDb();
      const app = createServer({ db: mockDb, jwtSecret: TEST_SECRET });

      const res = await app.handle(
        new Request('http://localhost/api/admin/experiences', {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(res.status).toBe(200);

      const body = (await res.json()) as any;
      expect(body.status).toBe('success');
      expect(body.data).toHaveLength(1);
      expect(body.data[0].company).toBe('Tech Corp');
    });

    it('GET /api/admin/experiences/:id - retrieves experience detail', async () => {
      const mockDb = createMockAdminDb();
      const app = createServer({ db: mockDb, jwtSecret: TEST_SECRET });

      const res = await app.handle(
        new Request('http://localhost/api/admin/experiences/1', {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(res.status).toBe(200);

      const body = (await res.json()) as any;
      expect(body.status).toBe('success');
      expect(body.data.role).toBe('QA Engineer');
    });

    it('GET /api/admin/experiences/:id - returns 404 when experience not found', async () => {
      const mockDb = createMockAdminDb();
      const app = createServer({ db: mockDb, jwtSecret: TEST_SECRET });

      const res = await app.handle(
        new Request('http://localhost/api/admin/experiences/999', {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(res.status).toBe(404);
      const body = (await res.json()) as any;
      expect(body.message).toBe('Experience not found');
    });

    it('POST /api/admin/experiences - creates an experience entry', async () => {
      const mockDb = createMockAdminDb();
      const app = createServer({ db: mockDb, jwtSecret: TEST_SECRET });

      const res = await app.handle(
        new Request('http://localhost/api/admin/experiences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            company: 'NextGen Solutions',
            role: 'Automation Lead',
            location: 'Remote',
            startDate: '2024-02-01',
            isCurrent: true,
            description: 'Overseeing test suites and quality gates.',
            sortOrder: 1,
          }),
        })
      );

      expect(res.status).toBe(201);
      const body = (await res.json()) as any;
      expect(body.status).toBe('success');
      expect(body.data.company).toBe('NextGen Solutions');
      expect(body.data.isCurrent).toBe(true);
      expect(body.data.endDate).toBeNull();
    });

    it('POST /api/admin/experiences - returns 400 when startDate is after endDate', async () => {
      const mockDb = createMockAdminDb();
      const app = createServer({ db: mockDb, jwtSecret: TEST_SECRET });

      const res = await app.handle(
        new Request('http://localhost/api/admin/experiences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            company: 'Invalid Date Lab',
            role: 'Tester',
            startDate: '2024-10-01',
            endDate: '2024-01-01', // End date before start date
            isCurrent: false,
            description: 'Testing invalid dates',
          }),
        })
      );

      expect(res.status).toBe(400);
      const body = (await res.json()) as any;
      expect(body).toEqual({
        status: 'error',
        message: 'Invalid date range: startDate cannot be after endDate',
      });
    });

    it('PUT /api/admin/experiences/:id - updates an experience', async () => {
      const mockDb = createMockAdminDb();
      const app = createServer({ db: mockDb, jwtSecret: TEST_SECRET });

      const res = await app.handle(
        new Request('http://localhost/api/admin/experiences/1', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            role: 'Staff QA Engineer',
            location: 'Bandung, Indonesia',
          }),
        })
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.status).toBe('success');
      expect(body.data.role).toBe('Staff QA Engineer');
      expect(body.data.location).toBe('Bandung, Indonesia');
    });

    it('PUT /api/admin/experiences/:id - returns 404 when experience not found', async () => {
      const mockDb = createMockAdminDb();
      const app = createServer({ db: mockDb, jwtSecret: TEST_SECRET });

      const res = await app.handle(
        new Request('http://localhost/api/admin/experiences/999', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ role: 'Ghost Role' }),
        })
      );

      expect(res.status).toBe(404);
    });

    it('DELETE /api/admin/experiences/:id - deletes experience', async () => {
      const mockDb = createMockAdminDb();
      const app = createServer({ db: mockDb, jwtSecret: TEST_SECRET });

      const res = await app.handle(
        new Request('http://localhost/api/admin/experiences/1', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.message).toBe('Experience deleted successfully');

      // Verify deletion
      const checkRes = await app.handle(
        new Request('http://localhost/api/admin/experiences/1', {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(checkRes.status).toBe(404);
    });

    it('DELETE /api/admin/experiences/:id - returns 404 when experience not found', async () => {
      const mockDb = createMockAdminDb();
      const app = createServer({ db: mockDb, jwtSecret: TEST_SECRET });

      const res = await app.handle(
        new Request('http://localhost/api/admin/experiences/999', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );

      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------
  // 4. Admin Contacts (/api/admin/contacts)
  // -------------------------------------------------------------
  describe('Admin Contacts (/api/admin/contacts)', () => {
    let adminToken: string;

    it('prepares admin token', async () => {
      adminToken = await signAuthToken(
        { id: 1, email: 'admin@qa-portfolio.local', role: 'admin' },
        TEST_SECRET,
        '1h'
      );
    });

    it('GET /api/admin/contacts - lists all incoming messages', async () => {
      const mockDb = createMockAdminDb();
      const app = createServer({ db: mockDb, jwtSecret: TEST_SECRET });

      const res = await app.handle(
        new Request('http://localhost/api/admin/contacts', {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(res.status).toBe(200);

      const body = (await res.json()) as any;
      expect(body.status).toBe('success');
      expect(body.data).toHaveLength(2);
    });

    it('GET /api/admin/contacts?status=unread - filters messages by status', async () => {
      const mockDb = createMockAdminDb();
      const app = createServer({ db: mockDb, jwtSecret: TEST_SECRET });

      const res = await app.handle(
        new Request('http://localhost/api/admin/contacts?status=unread', {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(res.status).toBe(200);

      const body = (await res.json()) as any;
      expect(body.status).toBe('success');
      expect(body.data).toHaveLength(1);
      expect(body.data[0].email).toBe('alice@example.com');
    });

    it('GET /api/admin/contacts/:id - retrieves message detail', async () => {
      const mockDb = createMockAdminDb();
      const app = createServer({ db: mockDb, jwtSecret: TEST_SECRET });

      const res = await app.handle(
        new Request('http://localhost/api/admin/contacts/1', {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(res.status).toBe(200);

      const body = (await res.json()) as any;
      expect(body.status).toBe('success');
      expect(body.data.name).toBe('Alice Wonder');
      expect(body.data.message).toContain('Looking for a QA automation specialist');
    });

    it('GET /api/admin/contacts/:id - returns 404 when contact message does not exist', async () => {
      const mockDb = createMockAdminDb();
      const app = createServer({ db: mockDb, jwtSecret: TEST_SECRET });

      const res = await app.handle(
        new Request('http://localhost/api/admin/contacts/999', {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(res.status).toBe(404);
      const body = (await res.json()) as any;
      expect(body.message).toBe('Contact message not found');
    });

    it('PATCH /api/admin/contacts/:id/status - updates status to read', async () => {
      const mockDb = createMockAdminDb();
      const app = createServer({ db: mockDb, jwtSecret: TEST_SECRET });

      const res = await app.handle(
        new Request('http://localhost/api/admin/contacts/1/status', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ status: 'read' }),
        })
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.status).toBe('success');
      expect(body.message).toBe('Contact status updated successfully');
      expect(body.data.status).toBe('read');
    });

    it('PATCH /api/admin/contacts/:id/status - returns 404 when contact does not exist', async () => {
      const mockDb = createMockAdminDb();
      const app = createServer({ db: mockDb, jwtSecret: TEST_SECRET });

      const res = await app.handle(
        new Request('http://localhost/api/admin/contacts/999/status', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ status: 'archived' }),
        })
      );

      expect(res.status).toBe(404);
    });

    it('PATCH /api/admin/contacts/:id/status - returns 400 when invalid status is submitted', async () => {
      const mockDb = createMockAdminDb();
      const app = createServer({ db: mockDb, jwtSecret: TEST_SECRET });

      const res = await app.handle(
        new Request('http://localhost/api/admin/contacts/1/status', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ status: 'invalid_status_enum' }),
        })
      );

      expect(res.status).toBe(400);
      const body = (await res.json()) as any;
      expect(body.status).toBe('error');
    });
  });

  // -------------------------------------------------------------
  // 5. OpenAPI / Swagger Documentation
  // -------------------------------------------------------------
  describe('OpenAPI / Swagger Integration for Admin Endpoints', () => {
    it('documents all admin endpoints with security schemes and tags', async () => {
      const app = createServer();
      const res = await app.handle(new Request('http://localhost/swagger/json'));
      expect(res.status).toBe(200);

      const spec = (await res.json()) as any;
      expect(spec.paths).toBeDefined();

      // Security scheme
      expect(spec.components?.securitySchemes?.bearerAuth).toBeDefined();
      expect(spec.components.securitySchemes.bearerAuth.scheme).toBe('bearer');

      // Admin Projects
      expect(spec.paths['/api/admin/projects']).toBeDefined();
      expect(spec.paths['/api/admin/projects'].get.tags).toContain('Admin Projects');
      expect(spec.paths['/api/admin/projects'].post.tags).toContain('Admin Projects');
      expect(spec.paths['/api/admin/projects/{id}']).toBeDefined();
      expect(spec.paths['/api/admin/projects/{id}'].get.tags).toContain('Admin Projects');
      expect(spec.paths['/api/admin/projects/{id}'].put.tags).toContain('Admin Projects');
      expect(spec.paths['/api/admin/projects/{id}'].delete.tags).toContain('Admin Projects');

      // Admin Experiences
      expect(spec.paths['/api/admin/experiences']).toBeDefined();
      expect(spec.paths['/api/admin/experiences'].get.tags).toContain('Admin Experiences');
      expect(spec.paths['/api/admin/experiences'].post.tags).toContain('Admin Experiences');
      expect(spec.paths['/api/admin/experiences/{id}']).toBeDefined();
      expect(spec.paths['/api/admin/experiences/{id}'].get.tags).toContain('Admin Experiences');
      expect(spec.paths['/api/admin/experiences/{id}'].put.tags).toContain('Admin Experiences');
      expect(spec.paths['/api/admin/experiences/{id}'].delete.tags).toContain('Admin Experiences');

      // Admin Contacts
      expect(spec.paths['/api/admin/contacts']).toBeDefined();
      expect(spec.paths['/api/admin/contacts'].get.tags).toContain('Admin Contacts');
      expect(spec.paths['/api/admin/contacts/{id}']).toBeDefined();
      expect(spec.paths['/api/admin/contacts/{id}'].get.tags).toContain('Admin Contacts');
      expect(spec.paths['/api/admin/contacts/{id}/status']).toBeDefined();
      expect(spec.paths['/api/admin/contacts/{id}/status'].patch.tags).toContain('Admin Contacts');
    });
  });
});
