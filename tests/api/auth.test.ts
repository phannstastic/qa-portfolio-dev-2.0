import { describe, expect, it } from 'bun:test';
import { createServer } from '../../src/index';
import { verifyAuthToken, getJwtSecret } from '../../src/utils/jwt';

describe('Authentication API (POST /api/auth/login)', () => {
  const TEST_JWT_SECRET = 'mock_jwt_secret_for_auth_tests_1234567890';
  const MOCK_PASSWORD = 'CorrectAdminPassword123!';

  // Helper to create a mock user with hashed password
  const createMockDb = (userExists: boolean = true, shouldThrow: boolean = false) => {
    let mockHashedPassword = '';
    return {
      init: async () => {
        mockHashedPassword = await Bun.password.hash(MOCK_PASSWORD, {
          algorithm: 'bcrypt',
          cost: 10,
        });
      },
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => {
              if (shouldThrow) {
                throw new Error('Simulated database connection failure');
              }
              if (!userExists) {
                return [];
              }
              return [
                {
                  id: 1,
                  name: 'QA Portfolio Admin',
                  email: 'admin@qa-portfolio.local',
                  passwordHash: mockHashedPassword,
                  role: 'superadmin',
                },
              ];
            },
          }),
        }),
      }),
    };
  };

  // 1. Successful Login
  it('returns 200, JWT token, and safe user data without password hash when credentials are valid', async () => {
    const mockDb = createMockDb(true);
    await mockDb.init();

    const app = createServer({ db: mockDb, jwtSecret: TEST_JWT_SECRET });

    const response = await app.handle(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@qa-portfolio.local',
          password: MOCK_PASSWORD,
        }),
      })
    );

    expect(response.status).toBe(200);

    const body = (await response.json()) as any;
    expect(body.status).toBe('success');
    expect(body.message).toBe('Login successful');
    expect(body.data).toBeDefined();
    expect(body.data.token).toBeDefined();
    expect(typeof body.data.token).toBe('string');

    // Safe user profile check
    expect(body.data.user).toEqual({
      id: 1,
      name: 'QA Portfolio Admin',
      email: 'admin@qa-portfolio.local',
      role: 'superadmin',
    });

    // CRITICAL: Ensure password and passwordHash are NEVER leaked in response
    expect((body.data.user as any).password).toBeUndefined();
    expect((body.data.user as any).passwordHash).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain('passwordHash');

    // Verify generated JWT token
    const verified = await verifyAuthToken(body.data.token, TEST_JWT_SECRET);
    expect(verified.id).toBe(1);
    expect(verified.email).toBe('admin@qa-portfolio.local');
    expect(verified.role).toBe('superadmin');
    expect(verified.exp).toBeDefined();

    // Verify token expiration is approximately 7 days from now
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const sevenDaysInSeconds = 7 * 24 * 60 * 60;
    expect(verified.exp!).toBeGreaterThan(nowInSeconds + sevenDaysInSeconds - 60);
    expect(verified.exp!).toBeLessThanOrEqual(nowInSeconds + sevenDaysInSeconds + 60);
  });

  // 2. Case Insensitive Email Match
  it('authenticates successfully when email is provided with mixed case', async () => {
    const mockDb = createMockDb(true);
    await mockDb.init();

    const app = createServer({ db: mockDb, jwtSecret: TEST_JWT_SECRET });

    const response = await app.handle(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'Admin@QA-Portfolio.LOCAL',
          password: MOCK_PASSWORD,
        }),
      })
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as any;
    expect(body.status).toBe('success');
    expect(body.data.user.email).toBe('admin@qa-portfolio.local');
  });

  // 3. Wrong Password
  it('returns 401 with generic error message when password does not match', async () => {
    const mockDb = createMockDb(true);
    await mockDb.init();

    const app = createServer({ db: mockDb, jwtSecret: TEST_JWT_SECRET });

    const response = await app.handle(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@qa-portfolio.local',
          password: 'WrongPassword999!',
        }),
      })
    );

    expect(response.status).toBe(401);
    const body = (await response.json()) as any;
    expect(body).toEqual({
      status: 'error',
      message: 'Invalid email or password',
    });
  });

  // 4. User Not Found
  it('returns 401 with identical generic error message when user does not exist (enumeration prevention)', async () => {
    const mockDb = createMockDb(false); // User does not exist

    const app = createServer({ db: mockDb, jwtSecret: TEST_JWT_SECRET });

    const response = await app.handle(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@qa-portfolio.local',
          password: MOCK_PASSWORD,
        }),
      })
    );

    expect(response.status).toBe(401);
    const body = (await response.json()) as any;
    expect(body).toEqual({
      status: 'error',
      message: 'Invalid email or password',
    });
  });

  // 5. Invalid Input Validation (TypeBox)
  describe('Input Format Validation', () => {
    it('returns 400 when email format is invalid', async () => {
      const mockDb = createMockDb(true);
      const app = createServer({ db: mockDb, jwtSecret: TEST_JWT_SECRET });

      const response = await app.handle(
        new Request('http://localhost/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'not-an-email',
            password: 'SomePassword123!',
          }),
        })
      );

      expect(response.status).toBe(400);
      const body = (await response.json()) as any;
      expect(body.status).toBe('error');
    });

    it('returns 400 when password is empty string', async () => {
      const mockDb = createMockDb(true);
      const app = createServer({ db: mockDb, jwtSecret: TEST_JWT_SECRET });

      const response = await app.handle(
        new Request('http://localhost/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'admin@qa-portfolio.local',
            password: '',
          }),
        })
      );

      expect(response.status).toBe(400);
      const body = (await response.json()) as any;
      expect(body.status).toBe('error');
    });

    it('returns 400 when payload is missing required fields', async () => {
      const mockDb = createMockDb(true);
      const app = createServer({ db: mockDb, jwtSecret: TEST_JWT_SECRET });

      const response = await app.handle(
        new Request('http://localhost/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'admin@qa-portfolio.local',
          }),
        })
      );

      expect(response.status).toBe(400);
      const body = (await response.json()) as any;
      expect(body.status).toBe('error');
    });
  });

  // 6. Missing JWT Secret Configuration
  describe('Configuration Validation', () => {
    it('returns 500 when JWT_SECRET is missing or empty', async () => {
      const mockDb = createMockDb(true);
      await mockDb.init();

      // Pass empty jwtSecret
      const app = createServer({ db: mockDb, jwtSecret: '' });

      const response = await app.handle(
        new Request('http://localhost/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'admin@qa-portfolio.local',
            password: MOCK_PASSWORD,
          }),
        })
      );

      expect(response.status).toBe(500);
      const body = (await response.json()) as any;
      expect(body).toEqual({
        status: 'error',
        message: 'Server configuration error: JWT secret is missing or empty',
      });
    });

    it('getJwtSecret throws an error when environment secret is undefined', () => {
      expect(() => {
        getJwtSecret('');
      }).toThrow('JWT_SECRET environment variable is missing or empty.');
    });
  });

  // 7. Database Failure Handling
  it('returns 500 when database throws an unexpected error', async () => {
    const mockDb = createMockDb(true, true); // shouldThrow = true
    const app = createServer({ db: mockDb, jwtSecret: TEST_JWT_SECRET });

    const response = await app.handle(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@qa-portfolio.local',
          password: MOCK_PASSWORD,
        }),
      })
    );

    expect(response.status).toBe(500);
    const body = (await response.json()) as any;
    expect(body).toEqual({
      status: 'error',
      message: 'An unexpected database error occurred',
    });
  });

  // 8. Swagger / OpenAPI Integration Check
  it('includes /api/auth/login in OpenAPI documentation with Authentication tag', async () => {
    const app = createServer({ jwtSecret: TEST_JWT_SECRET });
    const response = await app.handle(new Request('http://localhost/swagger/json'));

    expect(response.status).toBe(200);
    const spec = (await response.json()) as any;

    expect(spec.paths).toHaveProperty('/api/auth/login');
    expect(spec.paths['/api/auth/login']).toHaveProperty('post');
    expect(spec.paths['/api/auth/login'].post.tags).toContain('Authentication');
  });
});
