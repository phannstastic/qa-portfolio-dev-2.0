import { describe, expect, it } from 'bun:test';
import { app } from '../../src/index';

describe('Health Check API', () => {
  it('GET /health returns 200 and healthy status JSON', async () => {
    const response = await app.handle(new Request('http://localhost/health'));

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('status', 'success');
    expect(data).toHaveProperty('message', 'Server is healthy');
    expect(data).toHaveProperty('timestamp');
  });

  it('GET /swagger returns 200 or 302 for documentation', async () => {
    const response = await app.handle(new Request('http://localhost/swagger'));
    expect([200, 302]).toContain(response.status);
  });
});
