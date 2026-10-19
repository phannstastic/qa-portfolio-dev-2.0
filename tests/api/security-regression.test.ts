import { describe, expect, it } from 'bun:test';
import * as jose from 'jose';
import { createServer } from '../../src/index';
import { signAuthToken } from '../../src/utils/jwt';

describe('Security & Regression Test Suite (Task 9)', () => {
  const jwtSecret = 'test_security_regression_jwt_secret_98765';

  // Helper to create a mock database
  function createSecurityMockDb(overrides?: {
    userRole?: string;
    userId?: number;
    userExists?: boolean;
    existingProjects?: any[];
    existingExperiences?: any[];
    existingContacts?: any[];
  }) {
    const userRole = overrides?.userRole ?? 'admin';
    const userId = overrides?.userId ?? 1;
    const userExists = overrides?.userExists ?? true;

    return {
      select: (fields?: any) => ({
        from: (table: any) => ({
          limit: async (n: number) => {
            if (!userExists) return [];
            return [{ id: userId, name: 'Test User', email: 'test@example.com', role: userRole }];
          },
          where: (condition: any) => ({
            limit: async (n: number) => {
              // User query
              if (!userExists) return [];
              return [{ id: userId, name: 'Test User', email: 'test@example.com', role: userRole }];
            },
            orderBy: async (order: any) => overrides?.existingContacts || [],
          }),
          orderBy: async (order: any) => overrides?.existingProjects || overrides?.existingExperiences || [],
        }),
      }),
      insert: (table: any) => ({
        values: async (data: any) => [{ insertId: 101, id: 101 }],
      }),
      update: (table: any) => ({
        set: (data: any) => ({
          where: async (condition: any) => [{ affectedRows: 1 }],
        }),
      }),
      delete: (table: any) => ({
        where: async (condition: any) => [{ affectedRows: 1 }],
      }),
    };
  }

  // ==========================================================================
  // 1. JWT Security & Tamper Resistance
  // ==========================================================================
  describe('JWT Security & Signature Validation', () => {
    it('SEC-JWT-01: Rejects token signed with an untrusted / foreign secret key', async () => {
      const foreignSecret = 'attacker_secret_key_that_does_not_match';
      const fakeToken = await new jose.SignJWT({ id: 1, email: 'admin@example.com', role: 'admin' })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(foreignSecret));

      const app = createServer({ db: createSecurityMockDb() as any, jwtSecret });
      const res = await app.handle(
        new Request('http://localhost/api/admin/projects', {
          headers: { Authorization: `Bearer ${fakeToken}` },
        })
      );

      expect(res.status).toBe(401);
      const json = (await res.json()) as any;
      expect(json.status).toBe('error');
      expect(json.message).toContain('Unauthorized');
    });

    it('SEC-JWT-02: Rejects expired JWT token', async () => {
      // Create a token that expired 1 hour ago
      const expiredToken = await new jose.SignJWT({ id: 1, email: 'admin@example.com', role: 'admin' })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
        .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
        .sign(new TextEncoder().encode(jwtSecret));

      const app = createServer({ db: createSecurityMockDb() as any, jwtSecret });
      const res = await app.handle(
        new Request('http://localhost/api/admin/projects', {
          headers: { Authorization: `Bearer ${expiredToken}` },
        })
      );

      expect(res.status).toBe(401);
      const json = (await res.json()) as any;
      expect(json.status).toBe('error');
      expect(json.message).toContain('Unauthorized');
    });

    it('SEC-JWT-03: Rejects malformed Authorization header formats', async () => {
      const app = createServer({ db: createSecurityMockDb() as any, jwtSecret });

      // No Bearer prefix
      const res1 = await app.handle(
        new Request('http://localhost/api/admin/projects', {
          headers: { Authorization: 'Basic dXNlcjpwYXNz' },
        })
      );
      expect(res1.status).toBe(401);

      // Empty token after Bearer
      const res2 = await app.handle(
        new Request('http://localhost/api/admin/projects', {
          headers: { Authorization: 'Bearer ' },
        })
      );
      expect(res2.status).toBe(401);
    });

    it('SEC-JWT-04: Rejects token when user ID no longer exists in database (session revocation)', async () => {
      const token = await signAuthToken({ id: 999, email: 'revoked@example.com', role: 'admin' }, jwtSecret);
      const app = createServer({ db: createSecurityMockDb({ userExists: false }) as any, jwtSecret });

      const res = await app.handle(
        new Request('http://localhost/api/admin/projects', {
          headers: { Authorization: `Bearer ${token}` },
        })
      );

      expect(res.status).toBe(401);
      const json = (await res.json()) as any;
      expect(json.message).toContain('User not found');
    });
  });

  // ==========================================================================
  // 2. Role-Based Access Control (RBAC) & Privilege Escalation
  // ==========================================================================
  describe('RBAC & Role Privilege Escalation Prevention', () => {
    it('SEC-RBAC-01: Rejects non-admin user (role: "user") from accessing admin projects', async () => {
      const token = await signAuthToken({ id: 10, email: 'regular@example.com', role: 'user' }, jwtSecret);
      const app = createServer({ db: createSecurityMockDb({ userRole: 'user', userId: 10 }) as any, jwtSecret });

      const res = await app.handle(
        new Request('http://localhost/api/admin/projects', {
          headers: { Authorization: `Bearer ${token}` },
        })
      );

      expect(res.status).toBe(403);
      const json = (await res.json()) as any;
      expect(json.status).toBe('error');
      expect(json.message).toContain('Forbidden');
    });

    it('SEC-RBAC-02: Rejects non-admin user from managing experiences', async () => {
      const token = await signAuthToken({ id: 10, email: 'regular@example.com', role: 'guest' }, jwtSecret);
      const app = createServer({ db: createSecurityMockDb({ userRole: 'guest', userId: 10 }) as any, jwtSecret });

      const res = await app.handle(
        new Request('http://localhost/api/admin/experiences', {
          headers: { Authorization: `Bearer ${token}` },
        })
      );

      expect(res.status).toBe(403);
    });

    it('SEC-RBAC-03: Rejects non-admin user from viewing contact inquiries', async () => {
      const token = await signAuthToken({ id: 10, email: 'regular@example.com', role: 'member' }, jwtSecret);
      const app = createServer({ db: createSecurityMockDb({ userRole: 'member', userId: 10 }) as any, jwtSecret });

      const res = await app.handle(
        new Request('http://localhost/api/admin/contacts', {
          headers: { Authorization: `Bearer ${token}` },
        })
      );

      expect(res.status).toBe(403);
    });
  });

  // ==========================================================================
  // 3. Input Validation Boundaries & Injection Defenses
  // ==========================================================================
  describe('Input Validation & Injection Defenses', () => {
    it('SEC-INJ-01: Safely processes SQL injection payloads in public search without errors', async () => {
      const app = createServer({ db: createSecurityMockDb() as any, jwtSecret });
      const sqlInjectionQuery = "' OR '1'='1' UNION SELECT * FROM users --";

      const res = await app.handle(
        new Request(`http://localhost/api/projects?q=${encodeURIComponent(sqlInjectionQuery)}`)
      );

      // Must succeed safely via parameterization without crashing or returning internal SQL error
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.status).toBe('success');
      expect(Array.isArray(json.data)).toBe(true);
    });

    it('SEC-INJ-02: Stores contact message with XSS payload safely', async () => {
      const app = createServer({ db: createSecurityMockDb() as any, jwtSecret });
      const xssPayload = {
        name: 'Attacker',
        email: 'attacker@example.com',
        subject: '<script>alert("XSS")</script>',
        message: '<img src=x onerror=alert(document.cookie)> This is a valid inquiry message with xss.',
      };

      const res = await app.handle(
        new Request('http://localhost/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(xssPayload),
        })
      );

      expect(res.status).toBe(201);
      const json = (await res.json()) as any;
      expect(json.status).toBe('success');
      expect(json.data.message).toContain('<img src=x onerror=alert(document.cookie)>');
    });

    it('SEC-INJ-03: Rejects contact submission with message length exceeding 500 characters', async () => {
      const app = createServer({ db: createSecurityMockDb() as any, jwtSecret });
      const oversizedPayload = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        message: 'A'.repeat(501),
      };

      const res = await app.handle(
        new Request('http://localhost/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(oversizedPayload),
        })
      );

      expect(res.status).toBe(400);
      const json = (await res.json()) as any;
      expect(json.status).toBe('error');
    });

    it('SEC-INJ-04: Rejects experience with invalid date format (non-ISO YYYY-MM-DD)', async () => {
      const token = await signAuthToken({ id: 1, email: 'admin@example.com', role: 'admin' }, jwtSecret);
      const app = createServer({ db: createSecurityMockDb() as any, jwtSecret });

      const res = await app.handle(
        new Request('http://localhost/api/admin/experiences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            company: 'QA Labs',
            role: 'Tester',
            startDate: '01/01/2023', // Invalid format, should be YYYY-MM-DD
            description: 'Responsibilities description',
          }),
        })
      );

      expect(res.status).toBe(400);
      const json = (await res.json()) as any;
      expect(json.status).toBe('error');
    });

    it('SEC-INJ-05: Rejects experience where startDate is after endDate', async () => {
      const token = await signAuthToken({ id: 1, email: 'admin@example.com', role: 'admin' }, jwtSecret);
      const app = createServer({ db: createSecurityMockDb() as any, jwtSecret });

      const res = await app.handle(
        new Request('http://localhost/api/admin/experiences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            company: 'QA Labs',
            role: 'Tester',
            startDate: '2025-01-01',
            endDate: '2024-01-01',
            isCurrent: false,
            description: 'Responsibilities description',
          }),
        })
      );

      expect(res.status).toBe(400);
      const json = (await res.json()) as any;
      expect(json.message).toContain('startDate cannot be after endDate');
    });

    it('SEC-INJ-06: Rejects contact status update with invalid status enum value', async () => {
      const token = await signAuthToken({ id: 1, email: 'admin@example.com', role: 'admin' }, jwtSecret);
      const app = createServer({ db: createSecurityMockDb() as any, jwtSecret });

      const res = await app.handle(
        new Request('http://localhost/api/admin/contacts/1/status', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: 'invalid_status_value' }),
        })
      );

      expect(res.status).toBe(400);
    });
  });

  // ==========================================================================
  // 4. Information Disclosure Defenses
  // ==========================================================================
  describe('Information Leakage Prevention', () => {
    it('SEC-LEAK-01: Login failure produces uniform error without revealing whether email or password was wrong', async () => {
      const mockHashedPassword = await Bun.password.hash('CorrectAdminPassword123!', {
        algorithm: 'bcrypt',
        cost: 10,
      });

      const mockDbWithUser = {
        select: () => ({
          from: () => ({
            where: () => ({
              limit: async () => [
                {
                  id: 1,
                  name: 'Muhammad Irfan Trinugroho',
                  email: 'admin@qa-portfolio.local',
                  passwordHash: mockHashedPassword,
                  role: 'superadmin',
                },
              ],
            }),
          }),
        }),
      };

      const mockDbNoUser = {
        select: () => ({
          from: () => ({
            where: () => ({
              limit: async () => [],
            }),
          }),
        }),
      };

      // Wrong email (user does not exist in DB)
      const app1 = createServer({ db: mockDbNoUser as any, jwtSecret });
      const res1 = await app1.handle(
        new Request('http://localhost/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'nonexistent@qa.local', password: 'SomePassword123!' }),
        })
      );
      expect(res1.status).toBe(401);
      const json1 = (await res1.json()) as any;

      // Wrong password (user exists in DB, but password does not match)
      const app2 = createServer({ db: mockDbWithUser as any, jwtSecret });
      const res2 = await app2.handle(
        new Request('http://localhost/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'admin@qa-portfolio.local', password: 'DefinitelyWrongPassword!' }),
        })
      );
      expect(res2.status).toBe(401);
      const json2 = (await res2.json()) as any;

      // Both must return identical generic error messages
      expect(json1.error).toBe(json2.error);
    });

    it('SEC-LEAK-02: Public user endpoints never return password_hash or secret fields', async () => {
      const app = createServer({ db: createSecurityMockDb() as any, jwtSecret });
      const res = await app.handle(new Request('http://localhost/api/profile'));

      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).not.toContain('password_hash');
      expect(text).not.toContain('password');
      expect(text).not.toContain('$2b$');
    });
  });
});
