import 'dotenv/config';
import { spawn, ChildProcess } from 'node:child_process';
import { setupE2EDatabase, resetE2EDatabase, DEFAULT_E2E_DB, validateE2EDatabaseName } from './support/db-setup';

const port = process.env.E2E_PORT || '3001';
const targetDb = process.env.E2E_DB_NAME || DEFAULT_E2E_DB;

// Fail-fast guard before running any process
validateE2EDatabaseName(targetDb);

async function waitForServer(url: string, timeoutMs: number = 20000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // Server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

async function runE2E() {
  console.log('========================================================');
  console.log(`🌐 Preparing Isolated E2E Database: ${targetDb}`);
  console.log('========================================================');

  try {
    await setupE2EDatabase(targetDb);
  } catch (err: any) {
    console.error(`❌ Failed to initialize E2E database "${targetDb}":`, err.message);
    process.exit(1);
  }

  console.log('========================================================');
  console.log(`🌐 Starting QA Portfolio SUT Server [DB: ${targetDb}]`);
  console.log('========================================================');

  // Spawn the Elysia server configured for E2E
  const serverProcess: ChildProcess = spawn('bun', ['tests/e2e/e2e-server.ts'], {
    env: { ...process.env, PORT: port, NODE_ENV: 'development', E2E_DB_NAME: targetDb },
    stdio: 'pipe',
    shell: true,
  });

  serverProcess.stdout?.on('data', (d) => {
    // Optional debug log
  });

  serverProcess.stderr?.on('data', (d) => {
    // Optional error log
  });

  const isReady = await waitForServer(`http://localhost:${port}/health`);
  if (!isReady) {
    console.error('❌ Server failed to start on http://localhost:' + port);
    serverProcess.kill();
    process.exit(1);
  }

  console.log(`✅ Server is healthy at http://localhost:${port}`);
  console.log('🚀 Launching Selenium WebDriver with Headless Chrome...');

  // Target tag or feature file from CLI args, if any
  const args = process.argv.slice(2);
  const cucumberArgs = [
    'x',
    'cucumber-js',
    ...args,
  ];

  const cucumberProcess = spawn('bun', cucumberArgs, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, E2E_DB_NAME: targetDb, E2E_BASE_URL: `http://localhost:${port}` },
  });

  cucumberProcess.on('exit', async (code) => {
    console.log('========================================================');
    console.log(`🏁 Cucumber browser test completed with exit code: ${code}`);
    console.log('========================================================');

    // Clean up server process
    try {
      if (serverProcess.pid) {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', serverProcess.pid.toString(), '/f', '/t']);
        } else {
          serverProcess.kill('SIGTERM');
        }
      }
    } catch {}

    // Clean up E2E database records
    try {
      console.log(`🧹 Cleaning up E2E database: ${targetDb}...`);
      await resetE2EDatabase(targetDb);
      console.log('✅ Cleanup completed.');
    } catch (cleanupErr: any) {
      console.error('⚠️ Cleanup warning:', cleanupErr.message);
    }

    process.exit(code || 0);
  });
}

runE2E();
