import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import mysql, { type PoolOptions, type Pool } from 'mysql2/promise';
import * as schema from './schema';

let sharedPool: Pool | null = null;
let sharedDb: MySql2Database<typeof schema> | null = null;

/**
 * Resolves MySQL connection pool configuration from environment variables.
 * Default connectionLimit is 4 to safely fit within MariaDB's hard limit of
 * 5 concurrent connections, configurable via DB_CONNECTION_LIMIT.
 */
export function getDbConfig(env: Record<string, string | undefined> = process.env): PoolOptions {
  const parsedLimit = Number(env.DB_CONNECTION_LIMIT);
  const connectionLimit = !isNaN(parsedLimit) && parsedLimit > 0 ? parsedLimit : 4;

  return {
    host: env.DB_HOST || '127.0.0.1',
    port: Number(env.DB_PORT) || 3306,
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'qa_portfolio_dev',
    waitForConnections: true,
    connectionLimit,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  };
}

/**
 * Factory to create or retrieve the singleton MySQL pool connection.
 * If customConfig is provided, creates a separate instance (useful for isolated tests).
 * When called without arguments, returns the shared singleton instance.
 */
export const createDbConnection = (customConfig?: PoolOptions): MySql2Database<typeof schema> => {
  if (customConfig) {
    const customPool = mysql.createPool(customConfig);
    return drizzle(customPool, { schema, mode: 'default' });
  }

  if (!sharedDb) {
    const poolConfig = getDbConfig();
    sharedPool = mysql.createPool(poolConfig);
    sharedDb = drizzle(sharedPool, { schema, mode: 'default' });
  }

  return sharedDb;
};

/**
 * Returns the active shared database pool (for inspection, metrics, or shutdown).
 */
export const getSharedPool = (): Pool | null => sharedPool;

/**
 * Safely closes the shared singleton connection pool (useful for tests and graceful shutdown).
 */
export const closeDbConnection = async (): Promise<void> => {
  if (sharedPool) {
    await sharedPool.end();
    sharedPool = null;
    sharedDb = null;
  }
};

export * from './schema';

