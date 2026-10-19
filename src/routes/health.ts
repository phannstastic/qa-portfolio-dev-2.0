import { Elysia, t } from 'elysia';

export const healthRoutes = new Elysia({ prefix: '/health' })
  .get(
    '',
    () => {
      return {
        status: 'success',
        message: 'Server is healthy',
        timestamp: new Date().toISOString(),
      };
    },
    {
      detail: {
        summary: 'Health check endpoint',
        description: 'Returns the operational status and timestamp of the server',
        tags: ['System'],
      },
      response: t.Object({
        status: t.String(),
        message: t.String(),
        timestamp: t.String(),
      }),
    }
  );
