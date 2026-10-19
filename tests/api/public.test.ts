import { describe, expect, it } from 'bun:test';
import { createServer } from '../../src/index';
import { MySqlDialect } from 'drizzle-orm/mysql-core';
import { users, projects, experiences, contacts } from '../../src/db';

const dialect = new MySqlDialect();

const MOCK_PROJECTS = [
  {
    id: 1,
    title: 'Elysia API Test Automation Framework',
    slug: 'elysia-api-test-automation-framework',
    description: 'Automated REST API testing suite utilizing Bun Test, Supertest, and CI/CD pipelines.',
    category: 'API Testing',
    techStack: 'Bun, ElysiaJS, TypeBox, REST API, GitHub Actions',
    githubUrl: 'https://github.com/example-qa/elysia-api-testing',
    liveDemoUrl: 'http://localhost:3000/swagger',
    imageUrl: '/images/projects/api-testing.png',
    isFeatured: true,
    sortOrder: 1,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: 2,
    title: 'Selenium + Cucumber BDD Automation',
    slug: 'selenium-cucumber-bdd-automation',
    description: 'End-to-End behavioral test automation suite featuring Page Object Model (POM).',
    category: 'Automation Testing',
    techStack: 'Selenium WebDriver, Cucumber, Java, TestNG, ExtentReports',
    githubUrl: 'https://github.com/example-qa/selenium-cucumber-pom',
    liveDemoUrl: 'https://example.com/demo/e2e-report',
    imageUrl: '/images/projects/selenium-bdd.png',
    isFeatured: true,
    sortOrder: 2,
    createdAt: new Date('2026-01-02T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
  },
  {
    id: 3,
    title: 'Performance & Load Testing Benchmark',
    slug: 'performance-load-testing-benchmark',
    description: 'High-throughput stress testing and scalability benchmarking for CMS APIs.',
    category: 'Performance Testing',
    techStack: 'k6, Grafana, InfluxDB, Node.js',
    githubUrl: 'https://github.com/example-qa/k6-load-benchmark',
    liveDemoUrl: 'https://example.com/demo/k6-dashboard',
    imageUrl: '/images/projects/k6-benchmark.png',
    isFeatured: false,
    sortOrder: 3,
    createdAt: new Date('2026-01-03T00:00:00Z'),
    updatedAt: new Date('2026-01-03T00:00:00Z'),
  },
];

const MOCK_EXPERIENCES = [
  {
    id: 1,
    company: 'Tech Innovations QA Lab',
    role: 'Senior QA Automation Engineer',
    location: 'Jakarta, Indonesia (Hybrid)',
    startDate: '2024-01-15',
    endDate: null,
    isCurrent: true,
    description: 'Architected automated test frameworks for microservices, reducing regression cycle times.',
    sortOrder: 1,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: 2,
    company: 'Global Software Solutions',
    role: 'QA Engineer',
    location: 'Bandung, Indonesia',
    startDate: '2022-08-01',
    endDate: '2023-12-31',
    isCurrent: false,
    description: 'Executed manual exploratory testing and formulated test plans.',
    sortOrder: 2,
    createdAt: new Date('2026-01-02T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
  },
];

const MOCK_USERS = [
  {
    id: 1,
    name: 'QA Portfolio Admin',
    email: 'admin@qa-portfolio.local',
    passwordHash: 'dummy_hash',
    role: 'superadmin',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  },
];

function evaluateCondition(row: any, condition: any): boolean {
  if (!condition) return true;
  const { sql, params } = dialect.sqlToQuery(condition);

  // 1. is_current check for experiences
  if (sql.includes('`experiences`.`is_current` = ?')) {
    const isCurrentVal = params[params.length - 1];
    return Boolean(row.isCurrent) === Boolean(isCurrentVal);
  }

  // 2. slug and/or id check for projects/:slug
  if (sql.includes('`projects`.`slug` = ?')) {
    if (sql.includes('`projects`.`id` = ?')) {
      const slugVal = params[0];
      const idVal = params[1];
      return row.slug === slugVal || row.id === Number(idVal);
    }
    return row.slug === params[0];
  }

  // 3. projects search, category, featured filters
  if (sql.includes('like ?')) {
    const term = typeof params[0] === 'string' ? params[0].replace(/%/g, '').toLowerCase() : '';
    const matchText =
      row.title.toLowerCase().includes(term) ||
      row.description.toLowerCase().includes(term) ||
      row.techStack.toLowerCase().includes(term);
    if (!matchText) return false;
  }

  if (sql.includes('`projects`.`category` = ?')) {
    const catIdx = sql.includes('like ?') ? 3 : 0;
    if (row.category !== params[catIdx]) return false;
  }

  if (sql.includes('`projects`.`is_featured` = ?')) {
    const featuredVal = params[params.length - 1];
    if (Boolean(row.isFeatured) !== Boolean(featuredVal)) return false;
  }

  return true;
}

function createMockPublicDb(options?: {
  projects?: any[];
  experiences?: any[];
  users?: any[];
  shouldThrow?: boolean;
}) {
  const shouldThrow = options?.shouldThrow ?? false;
  const projectData = options?.projects !== undefined ? options.projects : [...MOCK_PROJECTS];
  const experienceData = options?.experiences !== undefined ? options.experiences : [...MOCK_EXPERIENCES];
  const userData = options?.users !== undefined ? options.users : [...MOCK_USERS];
  let nextInsertId = 100;

  return {
    select: (_fields?: any) => ({
      from: (table: any) => {
        let currentData: any[] = [];
        const tableName = table?.name || (table?.[Symbol.for('drizzle:Name')]) || '';

        if (table === users || tableName === 'users') {
          currentData = [...userData];
        } else if (table === projects || tableName === 'projects') {
          currentData = [...projectData];
        } else if (table === experiences || tableName === 'experiences') {
          currentData = [...experienceData];
        }

        const createQuery = (data: any[]) => {
          let filtered = [...data];
          let limitCount: number | null = null;

          const queryObj = {
            where: (condition: any) => {
              filtered = filtered.filter((row) => evaluateCondition(row, condition));
              return queryObj;
            },
            orderBy: (..._cols: any[]) => {
              filtered.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
              return queryObj;
            },
            limit: (n: number) => {
              limitCount = n;
              return queryObj;
            },
            then: (resolve: (val: any) => void, reject: (err: any) => void) => {
              if (shouldThrow) {
                return reject(new Error('Simulated database error in public query'));
              }
              const res = limitCount !== null ? filtered.slice(0, limitCount) : filtered;
              resolve(res);
            },
          };
          return queryObj;
        };

        return createQuery(currentData);
      },
    }),
    insert: (_table: any) => ({
      values: async (val: any) => {
        if (shouldThrow) {
          throw new Error('Simulated database error on insert');
        }
        nextInsertId++;
        return [{ insertId: nextInsertId, ...val }];
      },
    }),
  };
}

describe('Public API Suite (Task 5)', () => {
  // 1. GET /api/profile
  describe('GET /api/profile', () => {
    it('returns 200 with full public profile including name, role headline, and social links', async () => {
      const mockDb = createMockPublicDb();
      const app = createServer({ db: mockDb });

      const response = await app.handle(new Request('http://localhost/api/profile'));
      expect(response.status).toBe(200);

      const body = (await response.json()) as any;
      expect(body.status).toBe('success');
      expect(body.data).toBeDefined();
      expect(body.data.name).toBe('QA Portfolio Admin');
      expect(body.data.email).toBe('admin@qa-portfolio.local');
      expect(body.data.title).toBe('QA Engineer');
      expect(body.data.location).toBeNull();
      expect(body.data.bio).toBe('QA Portfolio and Test Automation Showcase');
      expect(body.data.socialLinks).toEqual({
        github: null,
        linkedin: null,
      });

      // Crucial: ensure no passwords or internal metadata leaked
      expect(body.data.passwordHash).toBeUndefined();
      expect(JSON.stringify(body)).not.toContain('passwordHash');
    });

    it('returns 200 with fallback defaults when users and experiences tables are empty', async () => {
      const mockDb = createMockPublicDb({ users: [], experiences: [] });
      const app = createServer({ db: mockDb });

      const response = await app.handle(new Request('http://localhost/api/profile'));
      expect(response.status).toBe(200);

      const body = (await response.json()) as any;
      expect(body.status).toBe('success');
      expect(body.data.name).toBe('QA Portfolio');
      expect(body.data.title).toBe('QA Engineer');
    });

    it('returns 500 when database throws an unexpected error', async () => {
      const mockDb = createMockPublicDb({ shouldThrow: true });
      const app = createServer({ db: mockDb });

      const response = await app.handle(new Request('http://localhost/api/profile'));
      expect(response.status).toBe(500);

      const body = (await response.json()) as any;
      expect(body).toEqual({
        status: 'error',
        message: 'Failed to retrieve profile',
      });
    });
  });

  // 2. GET /api/skills
  describe('GET /api/skills', () => {
    it('returns 200 with categorized skills and extracted project technologies', async () => {
      const mockDb = createMockPublicDb();
      const app = createServer({ db: mockDb });

      const response = await app.handle(new Request('http://localhost/api/skills'));
      expect(response.status).toBe(200);

      const body = (await response.json()) as any;
      expect(body.status).toBe('success');
      expect(body.data.categories).toBeArray();
      expect(body.data.categories.length).toBe(3);
      expect(body.data.skills).toBeArray();

      // Check extracted technologies from mock projects
      expect(body.data.skills).toContain('Selenium WebDriver');
      expect(body.data.skills).toContain('Bun');
      expect(body.data.skills).toContain('k6');
    });

    it('returns 200 with empty categories and skills when projects table is empty', async () => {
      const mockDb = createMockPublicDb({ projects: [] });
      const app = createServer({ db: mockDb });

      const response = await app.handle(new Request('http://localhost/api/skills'));
      expect(response.status).toBe(200);

      const body = (await response.json()) as any;
      expect(body.status).toBe('success');
      expect(body.data.categories).toEqual([]);
      expect(body.data.skills).toEqual([]);
    });

    it('returns 500 when database throws an unexpected error', async () => {
      const mockDb = createMockPublicDb({ shouldThrow: true });
      const app = createServer({ db: mockDb });

      const response = await app.handle(new Request('http://localhost/api/skills'));
      expect(response.status).toBe(500);

      const body = (await response.json()) as any;
      expect(body).toEqual({
        status: 'error',
        message: 'Failed to retrieve skills',
      });
    });
  });

  // 3. GET /api/projects
  describe('GET /api/projects', () => {
    it('returns 200 with all projects sorted by sortOrder', async () => {
      const mockDb = createMockPublicDb();
      const app = createServer({ db: mockDb });

      const response = await app.handle(new Request('http://localhost/api/projects'));
      expect(response.status).toBe(200);

      const body = (await response.json()) as any;
      expect(body.status).toBe('success');
      expect(body.data).toHaveLength(3);
      expect(body.data[0].title).toBe('Elysia API Test Automation Framework');
      expect(body.data[1].title).toBe('Selenium + Cucumber BDD Automation');
      expect(body.data[2].title).toBe('Performance & Load Testing Benchmark');
    });

    it('filters projects by search query (q=Selenium)', async () => {
      const mockDb = createMockPublicDb();
      const app = createServer({ db: mockDb });

      const response = await app.handle(new Request('http://localhost/api/projects?q=Selenium'));
      expect(response.status).toBe(200);

      const body = (await response.json()) as any;
      expect(body.status).toBe('success');
      expect(body.data).toHaveLength(1);
      expect(body.data[0].slug).toBe('selenium-cucumber-bdd-automation');
    });

    it('filters projects by category (category=API Testing)', async () => {
      const mockDb = createMockPublicDb();
      const app = createServer({ db: mockDb });

      const response = await app.handle(
        new Request('http://localhost/api/projects?category=API%20Testing')
      );
      expect(response.status).toBe(200);

      const body = (await response.json()) as any;
      expect(body.status).toBe('success');
      expect(body.data).toHaveLength(1);
      expect(body.data[0].category).toBe('API Testing');
    });

    it('filters projects by featured status (featured=true)', async () => {
      const mockDb = createMockPublicDb();
      const app = createServer({ db: mockDb });

      const response = await app.handle(new Request('http://localhost/api/projects?featured=true'));
      expect(response.status).toBe(200);

      const body = (await response.json()) as any;
      expect(body.status).toBe('success');
      expect(body.data).toHaveLength(2);
      expect(body.data.every((p: any) => p.isFeatured === true)).toBe(true);
    });

    it('returns empty array when search query matches nothing', async () => {
      const mockDb = createMockPublicDb();
      const app = createServer({ db: mockDb });

      const response = await app.handle(new Request('http://localhost/api/projects?q=nonexistentkeyword999'));
      expect(response.status).toBe(200);

      const body = (await response.json()) as any;
      expect(body.status).toBe('success');
      expect(body.data).toEqual([]);
    });

    it('returns 500 when database throws an unexpected error', async () => {
      const mockDb = createMockPublicDb({ shouldThrow: true });
      const app = createServer({ db: mockDb });

      const response = await app.handle(new Request('http://localhost/api/projects'));
      expect(response.status).toBe(500);

      const body = (await response.json()) as any;
      expect(body).toEqual({
        status: 'error',
        message: 'Failed to retrieve projects',
      });
    });
  });

  // 4. GET /api/projects/:slug
  describe('GET /api/projects/:slug', () => {
    it('returns 200 with project details when matching slug is requested', async () => {
      const mockDb = createMockPublicDb();
      const app = createServer({ db: mockDb });

      const response = await app.handle(
        new Request('http://localhost/api/projects/selenium-cucumber-bdd-automation')
      );
      expect(response.status).toBe(200);

      const body = (await response.json()) as any;
      expect(body.status).toBe('success');
      expect(body.data.title).toBe('Selenium + Cucumber BDD Automation');
      expect(body.data.category).toBe('Automation Testing');
    });

    it('returns 200 with project details when numeric ID is requested', async () => {
      const mockDb = createMockPublicDb();
      const app = createServer({ db: mockDb });

      const response = await app.handle(new Request('http://localhost/api/projects/1'));
      expect(response.status).toBe(200);

      const body = (await response.json()) as any;
      expect(body.status).toBe('success');
      expect(body.data.id).toBe(1);
      expect(body.data.slug).toBe('elysia-api-test-automation-framework');
    });

    it('returns 404 when project does not exist', async () => {
      const mockDb = createMockPublicDb();
      const app = createServer({ db: mockDb });

      const response = await app.handle(
        new Request('http://localhost/api/projects/unknown-nonexistent-slug')
      );
      expect(response.status).toBe(404);

      const body = (await response.json()) as any;
      expect(body).toEqual({
        status: 'error',
        message: 'Project not found',
      });
    });

    it('returns 500 when database throws an unexpected error', async () => {
      const mockDb = createMockPublicDb({ shouldThrow: true });
      const app = createServer({ db: mockDb });

      const response = await app.handle(new Request('http://localhost/api/projects/1'));
      expect(response.status).toBe(500);

      const body = (await response.json()) as any;
      expect(body).toEqual({
        status: 'error',
        message: 'Failed to retrieve project details',
      });
    });
  });

  // 5. GET /api/experiences
  describe('GET /api/experiences', () => {
    it('returns 200 with all experiences sorted chronologically', async () => {
      const mockDb = createMockPublicDb();
      const app = createServer({ db: mockDb });

      const response = await app.handle(new Request('http://localhost/api/experiences'));
      expect(response.status).toBe(200);

      const body = (await response.json()) as any;
      expect(body.status).toBe('success');
      expect(body.data).toHaveLength(2);
      expect(body.data[0].company).toBe('Tech Innovations QA Lab');
      expect(body.data[0].isCurrent).toBe(true);
      expect(body.data[1].company).toBe('Global Software Solutions');
      expect(body.data[1].isCurrent).toBe(false);
    });

    it('returns 200 with empty array when no experiences exist', async () => {
      const mockDb = createMockPublicDb({ experiences: [] });
      const app = createServer({ db: mockDb });

      const response = await app.handle(new Request('http://localhost/api/experiences'));
      expect(response.status).toBe(200);

      const body = (await response.json()) as any;
      expect(body.status).toBe('success');
      expect(body.data).toEqual([]);
    });

    it('returns 500 when database throws an unexpected error', async () => {
      const mockDb = createMockPublicDb({ shouldThrow: true });
      const app = createServer({ db: mockDb });

      const response = await app.handle(new Request('http://localhost/api/experiences'));
      expect(response.status).toBe(500);

      const body = (await response.json()) as any;
      expect(body).toEqual({
        status: 'error',
        message: 'Failed to retrieve experiences',
      });
    });
  });

  // 6. POST /api/contacts
  describe('POST /api/contacts', () => {
    it('returns 201 and created contact data when valid payload with subject is submitted', async () => {
      const mockDb = createMockPublicDb();
      const app = createServer({ db: mockDb });

      const response = await app.handle(
        new Request('http://localhost/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Sarah Connor',
            email: 'sarah.connor@sky.net',
            subject: 'QA Test Consultation',
            message: 'We require automated regression testing for our mission critical platform.',
          }),
        })
      );

      expect(response.status).toBe(201);
      const body = (await response.json()) as any;
      expect(body.status).toBe('success');
      expect(body.message).toBe('Contact message submitted successfully');
      expect(body.data).toBeDefined();
      expect(body.data.id).toBeDefined();
      expect(body.data.name).toBe('Sarah Connor');
      expect(body.data.email).toBe('sarah.connor@sky.net');
      expect(body.data.subject).toBe('QA Test Consultation');
      expect(body.data.status).toBe('unread');
    });

    it('returns 201 and applies default subject when subject is omitted', async () => {
      const mockDb = createMockPublicDb();
      const app = createServer({ db: mockDb });

      const response = await app.handle(
        new Request('http://localhost/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'John Connor',
            email: 'john.connor@resistance.org',
            message: 'Inquiring about your performance testing and automation framework skills.',
          }),
        })
      );

      expect(response.status).toBe(201);
      const body = (await response.json()) as any;
      expect(body.status).toBe('success');
      expect(body.data.subject).toBe('General Inquiry');
    });

    it('returns 400 when message is shorter than 10 characters', async () => {
      const mockDb = createMockPublicDb();
      const app = createServer({ db: mockDb });

      const response = await app.handle(
        new Request('http://localhost/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Short Tester',
            email: 'tester@example.com',
            message: 'Too short', // 9 characters
          }),
        })
      );

      expect(response.status).toBe(400);
      const body = (await response.json()) as any;
      expect(body.status).toBe('error');
    });

    it('returns 400 when message exceeds 500 characters', async () => {
      const mockDb = createMockPublicDb();
      const app = createServer({ db: mockDb });

      const response = await app.handle(
        new Request('http://localhost/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Long Tester',
            email: 'tester@example.com',
            message: 'a'.repeat(501),
          }),
        })
      );

      expect(response.status).toBe(400);
      const body = (await response.json()) as any;
      expect(body.status).toBe('error');
    });

    it('returns 400 when email format is invalid', async () => {
      const mockDb = createMockPublicDb();
      const app = createServer({ db: mockDb });

      const response = await app.handle(
        new Request('http://localhost/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Invalid Email Tester',
            email: 'not-an-email-address',
            message: 'Valid length message about quality assurance testing.',
          }),
        })
      );

      expect(response.status).toBe(400);
      const body = (await response.json()) as any;
      expect(body.status).toBe('error');
    });

    it('returns 400 when name is empty or missing', async () => {
      const mockDb = createMockPublicDb();
      const app = createServer({ db: mockDb });

      const response = await app.handle(
        new Request('http://localhost/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: '',
            email: 'tester@example.com',
            message: 'Valid length message about quality assurance testing.',
          }),
        })
      );

      expect(response.status).toBe(400);
      const body = (await response.json()) as any;
      expect(body.status).toBe('error');
    });

    it('returns 500 when database throws an error during contact submission', async () => {
      const mockDb = createMockPublicDb({ shouldThrow: true });
      const app = createServer({ db: mockDb });

      const response = await app.handle(
        new Request('http://localhost/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Valid Tester',
            email: 'tester@example.com',
            message: 'Valid length message about quality assurance testing.',
          }),
        })
      );

      expect(response.status).toBe(500);
      const body = (await response.json()) as any;
      expect(body).toEqual({
        status: 'error',
        message: 'Failed to submit contact message',
      });
    });
  });

  // 7. OpenAPI / Swagger Documentation
  describe('OpenAPI / Swagger Integration', () => {
    it('documents all public endpoints in OpenAPI spec with correct tags', async () => {
      const app = createServer();
      const response = await app.handle(new Request('http://localhost/swagger/json'));
      expect(response.status).toBe(200);

      const spec = (await response.json()) as any;
      expect(spec.paths).toBeDefined();

      // Profile
      expect(spec.paths['/api/profile']).toBeDefined();
      expect(spec.paths['/api/profile'].get.tags).toContain('Profile');

      // Skills
      expect(spec.paths['/api/skills']).toBeDefined();
      expect(spec.paths['/api/skills'].get.tags).toContain('Skills');

      // Projects
      expect(spec.paths['/api/projects']).toBeDefined();
      expect(spec.paths['/api/projects'].get.tags).toContain('Projects');
      expect(spec.paths['/api/projects/{slug}']).toBeDefined();
      expect(spec.paths['/api/projects/{slug}'].get.tags).toContain('Projects');

      // Experiences
      expect(spec.paths['/api/experiences']).toBeDefined();
      expect(spec.paths['/api/experiences'].get.tags).toContain('Experiences');

      // Contacts
      expect(spec.paths['/api/contacts']).toBeDefined();
      expect(spec.paths['/api/contacts'].post.tags).toContain('Contacts');
    });
  });
});
