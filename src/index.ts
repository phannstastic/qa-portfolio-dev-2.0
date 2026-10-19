import { Elysia } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { healthRoutes } from './routes/health';
import { createAuthRoutes, type AuthRouteOptions } from './routes/auth';
import { createPublicRoutes, type PublicRouteOptions } from './routes/public';
import { createAdminRoutes, type AdminRouteOptions } from './routes/admin';
import { createDbConnection, closeDbConnection } from './db';

import { staticPlugin } from '@elysiajs/static';

/**
 * Resolves deployment server configuration from environment variables.
 * Prioritizes SERVER_PORT (standard in PaaS/Pterodactyl like Silly Development),
 * falling back to PORT, and finally default 3000.
 * Binds to 0.0.0.0 by default to ensure public reachability in containerized hosting.
 */
export function getServerConfig(env: Record<string, string | undefined> = process.env) {
  const port = Number(env.SERVER_PORT || env.PORT) || 3000;
  const hostname = env.HOST || '0.0.0.0';
  return { port, hostname };
}

const { port, hostname } = getServerConfig();

export interface AppServerOptions
  extends AuthRouteOptions,
    PublicRouteOptions,
    AdminRouteOptions {
  authDb?: any;
}

export const createServer = (options?: AppServerOptions) => {
  const sharedDb = options?.db || createDbConnection();
  const authDb = options?.authDb || sharedDb;

  return new Elysia()
    .use(
      swagger({
        path: '/swagger',
        documentation: {
          info: {
            title: 'QA Portfolio CMS API',
            version: '0.1.0',
            description: 'REST API for Personal QA Portfolio and CMS',
          },
          components: {
            securitySchemes: {
              bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Enter your JWT Bearer token obtained from POST /api/auth/login',
              },
            },
          },
          tags: [
            { name: 'System', description: 'System health and operational endpoints' },
            { name: 'Authentication', description: 'Admin authentication and session management' },
            { name: 'Profile', description: 'Public portfolio owner profile' },
            { name: 'Skills', description: 'Public technical skills and competencies' },
            { name: 'Projects', description: 'Public portfolio projects showcase' },
            { name: 'Experiences', description: 'Public career journey and professional experiences' },
            { name: 'Contacts', description: 'Public contact message submission' },
            { name: 'Admin Projects', description: 'Admin CMS project management (CRUD)' },
            { name: 'Admin Experiences', description: 'Admin CMS career experience management (CRUD)' },
            { name: 'Admin Contacts', description: 'Admin CMS contact inquiry management' },
          ],
        },
      })
    )
    .use(
      staticPlugin({
        assets: 'public',
        prefix: '',
      })
    )
    .get('/', ({ set }) => {
      set.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0';
      set.headers['Pragma'] = 'no-cache';
      return Bun.file('public/index.html');
    })
    .get('/login', ({ set }) => {
      set.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0';
      return Bun.file('public/login.html');
    })
    .get('/admin', ({ set }) => {
      set.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0';
      return Bun.file('public/admin.html');
    })
    .use(healthRoutes)
    .use(createAuthRoutes({ ...options, db: authDb }))
    .use(createPublicRoutes({ ...options, db: sharedDb }))
    .use(createAdminRoutes({ ...options, db: sharedDb }));
};

export const app = createServer();

if (import.meta.main) {
  const server = app.listen({ port, hostname }, () => {
    console.log(`🦊 Elysia server is running at http://${hostname === '0.0.0.0' ? 'localhost' : hostname}:${port}`);
    console.log(`📚 Swagger documentation available at http://${hostname === '0.0.0.0' ? 'localhost' : hostname}:${port}/swagger`);
  });

  const handleShutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}, closing server and database pool gracefully...`);
    try {
      server.stop();
      await closeDbConnection();
      console.log('✅ Server and database pool closed cleanly.');
      process.exit(0);
    } catch (err: any) {
      console.error('Error during shutdown:', err?.message || err);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
}
