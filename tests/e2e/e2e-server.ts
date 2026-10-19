import 'dotenv/config';
import { createServer } from '../../src/index';
import { createE2EDbConnection, DEFAULT_E2E_DB, validateE2EDatabaseName } from './support/db-setup';

const targetDb = process.env.E2E_DB_NAME || DEFAULT_E2E_DB;

// Fail-fast security validation: immediately abort if protected database is targeted
validateE2EDatabaseName(targetDb);

const e2eDb = createE2EDbConnection(targetDb);

// Pass e2eDb to createServer for all routes (auth, public, admin) without mocking
const app = createServer({ db: e2eDb });
const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`🚀 QA Portfolio E2E SUT Server listening on http://localhost:${port} [Target DB: ${targetDb}]`);
});
