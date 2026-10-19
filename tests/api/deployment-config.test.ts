import { describe, expect, it, afterEach } from 'bun:test';
import { getServerConfig, createServer } from '../../src/index';
import { getDbConfig, createDbConnection, getSharedPool, closeDbConnection } from '../../src/db/index';

describe('Deployment Configuration (Silly Development & Render Compatibility)', () => {
  describe('Server Port & Host Configuration (getServerConfig)', () => {
    it('prioritizes SERVER_PORT when provided by PaaS/SillyDev environment', () => {
      const env = {
        SERVER_PORT: '25432',
        PORT: '3000',
      };
      const config = getServerConfig(env);
      expect(config.port).toBe(25432);
      expect(config.hostname).toBe('0.0.0.0');
    });

    it('falls back to PORT when SERVER_PORT is not defined', () => {
      const env = {
        PORT: '8080',
      };
      const config = getServerConfig(env);
      expect(config.port).toBe(8080);
      expect(config.hostname).toBe('0.0.0.0');
    });

    it('falls back to default port 3000 when neither is defined', () => {
      const env = {};
      const config = getServerConfig(env);
      expect(config.port).toBe(3000);
      expect(config.hostname).toBe('0.0.0.0');
    });

    it('respects custom HOST environment variable when specified', () => {
      const env = {
        HOST: '127.0.0.1',
        PORT: '4000',
      };
      const config = getServerConfig(env);
      expect(config.port).toBe(4000);
      expect(config.hostname).toBe('127.0.0.1');
    });
  });

  describe('Database Connection Pool Configuration (getDbConfig)', () => {
    it('defaults connectionLimit to 4 for MariaDB hard limit (max 5)', () => {
      const env = {};
      const config = getDbConfig(env);
      expect(config.connectionLimit).toBe(4);
      expect(config.waitForConnections).toBe(true);
      expect(config.queueLimit).toBe(0);
      expect(config.host).toBe('127.0.0.1');
      expect(config.port).toBe(3306);
      expect(config.database).toBe('qa_portfolio_dev');
    });

    it('respects custom DB_CONNECTION_LIMIT from environment', () => {
      const env = {
        DB_CONNECTION_LIMIT: '2',
      };
      const config = getDbConfig(env);
      expect(config.connectionLimit).toBe(2);
    });

    it('correctly maps custom database credentials for production deployment', () => {
      const env = {
        DB_HOST: 'mariadb.sillydev.co.uk',
        DB_PORT: '3307',
        DB_USER: 'u123_portfolio',
        DB_PASSWORD: 'secretpassword',
        DB_NAME: 's123_irfanlab',
        DB_CONNECTION_LIMIT: '3',
      };
      const config = getDbConfig(env);
      expect(config.host).toBe('mariadb.sillydev.co.uk');
      expect(config.port).toBe(3307);
      expect(config.user).toBe('u123_portfolio');
      expect(config.password).toBe('secretpassword');
      expect(config.database).toBe('s123_irfanlab');
      expect(config.connectionLimit).toBe(3);
    });
  });

  describe('Singleton Database Connection Pool (Zero Pool Proliferation)', () => {
    afterEach(async () => {
      await closeDbConnection();
    });

    it('returns the exact same singleton database instance on repeated calls without customConfig', () => {
      const db1 = createDbConnection();
      const db2 = createDbConnection();
      expect(db1).toBe(db2);
      expect(getSharedPool()).not.toBeNull();
    });

    it('maintains a single underlying MySQL connection pool across multiple invocations', () => {
      const db1 = createDbConnection();
      const pool1 = getSharedPool();
      const db2 = createDbConnection();
      const pool2 = getSharedPool();
      const db3 = createDbConnection();
      const pool3 = getSharedPool();

      expect(pool1).toBe(pool2);
      expect(pool2).toBe(pool3);
    });

    it('resets the singleton instance when closeDbConnection is invoked', async () => {
      const db1 = createDbConnection();
      const pool1 = getSharedPool();
      expect(pool1).not.toBeNull();

      await closeDbConnection();
      expect(getSharedPool()).toBeNull();

      const db2 = createDbConnection();
      const pool2 = getSharedPool();
      expect(pool2).not.toBeNull();
      expect(pool1).not.toBe(pool2);
    });

    it('creates an isolated dedicated pool when customConfig is provided without overriding singleton', async () => {
      const defaultDb = createDbConnection();
      const defaultPool = getSharedPool();

      const customDb = createDbConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        database: 'isolated_custom_test_db',
      });

      expect(customDb).not.toBe(defaultDb);
      // defaultPool must still remain the active shared pool
      expect(getSharedPool()).toBe(defaultPool);
      await (customDb as any).$client?.end();
    });

    it('shares a single database connection instance across routes when createServer is instantiated without options', () => {
      const app = createServer();
      const activePool = getSharedPool();
      expect(activePool).not.toBeNull();

      // Subsequent call to createDbConnection yields the same pool as used by createServer
      const db = createDbConnection();
      expect(getSharedPool()).toBe(activePool);
    });
  });
});

