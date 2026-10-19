import { Elysia, t } from 'elysia';
import { eq } from 'drizzle-orm';
import { createDbConnection, users } from '../db';
import { getJwtSecret, signAuthToken } from '../utils/jwt';

export interface AuthRouteOptions {
  db?: any;
  jwtSecret?: string;
}

/**
 * Factory for Authentication routes.
 * Supports dependency injection for database and JWT secret for isolated unit testing.
 */
export const createAuthRoutes = (options?: AuthRouteOptions) => {
  return new Elysia({ prefix: '/api/auth' })
    .onError(({ code, error, set }) => {
      if (code === 'VALIDATION') {
        set.status = 400;
        return {
          status: 'error',
          message: 'Invalid request payload. Please provide a valid email and non-empty password.',
        };
      }
    })
    .post(
      '/login',
      async ({ body, set }) => {
        // 1. Validate JWT configuration
        try {
          getJwtSecret(options?.jwtSecret);
        } catch {
          set.status = 500;
          return {
            status: 'error',
            message: 'Server configuration error: JWT secret is missing or empty',
          };
        }

        const db = options?.db || createDbConnection();

        // 2. Query user from database
        let userList: Array<{
          id: number;
          name: string;
          email: string;
          passwordHash: string;
          role: string;
        }>;

        try {
          userList = await db
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
              passwordHash: users.passwordHash,
              role: users.role,
            })
            .from(users)
            .where(eq(users.email, body.email.toLowerCase().trim()))
            .limit(1);
        } catch (dbErr: any) {
          console.error('❌ Database query error during login:', dbErr?.message || dbErr);
          set.status = 500;
          return {
            status: 'error',
            message: 'An unexpected database error occurred',
          };
        }

        // 3. User existence check (generic 401 response)
        if (!userList || userList.length === 0) {
          set.status = 401;
          return {
            status: 'error',
            message: 'Invalid email or password',
          };
        }

        const user = userList[0];

        // 4. Verify password with stored bcrypt hash (generic 401 response)
        let isPasswordValid = false;
        try {
          isPasswordValid = await Bun.password.verify(body.password, user.passwordHash);
        } catch {
          isPasswordValid = false;
        }

        if (!isPasswordValid) {
          set.status = 401;
          return {
            status: 'error',
            message: 'Invalid email or password',
          };
        }

        // 5. Generate signed JWT token (expires in 7 days)
        const token = await signAuthToken(
          {
            id: user.id,
            email: user.email,
            role: user.role,
          },
          options?.jwtSecret,
          '7d'
        );

        // 6. Return success response (strictly safe user fields, passwordHash excluded)
        return {
          status: 'success',
          message: 'Login successful',
          data: {
            token,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
            },
          },
        };
      },
      {
        detail: {
          summary: 'User Login',
          description:
            'Authenticate an admin user using email and password, returning a JWT token for CMS operations.',
          tags: ['Authentication'],
        },
        body: t.Object({
          email: t.String({
            format: 'email',
            description: 'Registered user email address',
            examples: ['admin@qa-portfolio.local'],
          }),
          password: t.String({
            minLength: 1,
            description: 'Account password',
            examples: ['YourSecurePassword123!'],
          }),
        }),
        response: {
          200: t.Object({
            status: t.Literal('success'),
            message: t.String(),
            data: t.Object({
              token: t.String({ description: 'JWT Bearer token valid for 7 days' }),
              user: t.Object({
                id: t.Number(),
                name: t.String(),
                email: t.String(),
                role: t.String(),
              }),
            }),
          }),
          400: t.Object({
            status: t.Literal('error'),
            message: t.String(),
          }),
          401: t.Object({
            status: t.Literal('error'),
            message: t.String(),
          }),
          500: t.Object({
            status: t.Literal('error'),
            message: t.String(),
          }),
        },
      }
    );
};

export const authRoutes = createAuthRoutes();
