import 'dotenv/config';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import path from 'path';
import { initialProjects, initialExperiences } from '../../../src/db/seed';
import { users, projects, experiences, contacts } from '../../../src/db/schema';
import * as schema from '../../../src/db/schema';

export const DEFAULT_E2E_DB = 'qa_portfolio_e2e_test';
export const FORBIDDEN_DATABASES = ['qa_playground_db', 'qa_portfolio_dev'];
export const ALLOWED_E2E_DATABASES = [DEFAULT_E2E_DB];

/**
 * Strict fail-fast guard ensuring E2E tests never execute on protected databases.
 */
export function validateE2EDatabaseName(dbName: string): void {
  if (!dbName || typeof dbName !== 'string') {
    throw new Error('[SECURITY VIOLATION] Target database name is missing or invalid.');
  }

  if (FORBIDDEN_DATABASES.includes(dbName)) {
    throw new Error(
      `[SECURITY VIOLATION] Refusing to run E2E operations on protected database: "${dbName}". E2E tests must exclusively use an isolated test database (default: "${DEFAULT_E2E_DB}").`
    );
  }

  if (!ALLOWED_E2E_DATABASES.includes(dbName)) {
    throw new Error(
      `[SECURITY VIOLATION] Target database "${dbName}" is not in the allowed E2E whitelist: [${ALLOWED_E2E_DATABASES.join(', ')}].`
    );
  }
}

/**
 * Creates connection pool specifically for the isolated E2E test database.
 */
export function createE2EDbConnection(targetDb: string = DEFAULT_E2E_DB) {
  validateE2EDatabaseName(targetDb);

  const poolConnection = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: targetDb,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  return drizzle(poolConnection, { schema, mode: 'default' });
}

/**
 * Provisions, migrates, and seeds the isolated E2E test database.
 */
export async function setupE2EDatabase(targetDb: string = DEFAULT_E2E_DB): Promise<void> {
  validateE2EDatabaseName(targetDb);

  console.log(`🔒 [E2E DB Setup] Initializing isolated database: ${targetDb}...`);

  // 1. Create database if it does not exist using server-level connection
  const rootConn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${targetDb}\`;`);
  await rootConn.end();

  // 2. Connect specifically to targetDb and run Drizzle migrations
  const e2eConn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: targetDb,
  });

  // Verify connected database session name
  const [dbRows] = await e2eConn.query('SELECT DATABASE() as db;');
  const actualDb = (dbRows as any[])[0]?.db;
  validateE2EDatabaseName(actualDb);

  console.log(`   Running Drizzle migrations on ${actualDb}...`);
  const drizzleDb = drizzle(e2eConn, { schema, mode: 'default' });
  const migrationsFolder = path.resolve(import.meta.dir, '../../../drizzle');
  await migrate(drizzleDb, { migrationsFolder });

  // 3. Clean and Seed initial baseline data on targetDb
  console.log(`   Seeding baseline data on ${actualDb}...`);
  await drizzleDb.delete(contacts);
  await drizzleDb.delete(projects);
  await drizzleDb.delete(experiences);
  await drizzleDb.delete(users);
  await e2eConn.query('ALTER TABLE `users` AUTO_INCREMENT = 1;');
  await e2eConn.query('ALTER TABLE `projects` AUTO_INCREMENT = 1;');
  await e2eConn.query('ALTER TABLE `experiences` AUTO_INCREMENT = 1;');
  await e2eConn.query('ALTER TABLE `contacts` AUTO_INCREMENT = 1;');

  // Seed default admin user with hash of ValidAdminPassword123! or SEED_ADMIN_PASSWORD
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ValidAdminPassword123!';
  const passwordHash = await Bun.password.hash(adminPassword, { algorithm: 'bcrypt', cost: 10 });
  await drizzleDb.insert(users).values({
    id: 1,
    name: 'QA Portfolio Admin',
    email: 'admin@qa-portfolio.local',
    passwordHash,
    role: 'superadmin',
  });

  // Seed initial projects
  for (const p of initialProjects) {
    await drizzleDb.insert(projects).values(p);
  }

  // Seed initial experiences
  for (const exp of initialExperiences) {
    await drizzleDb.insert(experiences).values({
      company: exp.company,
      role: exp.role,
      location: exp.location,
      startDate: exp.startDate,
      endDate: exp.endDate,
      isCurrent: exp.isCurrent,
      description: exp.description,
      sortOrder: exp.sortOrder,
    });
  }

  console.log(`   ✅ Isolated E2E database ${actualDb} successfully migrated and seeded.`);
  await e2eConn.end();
}

/**
 * Resets E2E test database data back to baseline after tests complete.
 */
export async function resetE2EDatabase(targetDb: string = DEFAULT_E2E_DB): Promise<void> {
  validateE2EDatabaseName(targetDb);

  const e2eDb = createE2EDbConnection(targetDb);
  const client = (e2eDb as any).$client;
  const [dbRows] = await client.query('SELECT DATABASE() as db;');
  const actualDb = (dbRows as any[])[0]?.db;
  validateE2EDatabaseName(actualDb);

  // Clean up any test contact submissions or extra projects
  await e2eDb.delete(contacts);
  await client.end();
}
