import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

import { requireTestDatabase } from './helpers/test-database.js';

const databaseUrl = requireTestDatabase();
const env = { ...process.env, DATABASE_URL: databaseUrl };

// The guard runs before Prisma, and the child receives only the validated target.
const migration = spawnSync(
  process.execPath,
  ['node_modules/prisma/build/index.js', 'migrate', 'deploy'],
  {
    env,
    encoding: 'utf8',
    timeout: 60_000,
  },
);
if (migration.error || migration.status !== 0) {
  // Do not print driver diagnostics which may contain credentials.
  throw new Error(
    'Test migration failed. Check the local test database credentials and availability.',
  );
}
console.log('Test database migrations applied: ushly_test');

const files = readdirSync('tests')
  .filter((file) => file.endsWith('.integration.ts'))
  .sort();
if (files.length === 0) throw new Error('No integration tests found');
const result = spawnSync(
  process.execPath,
  [
    '--import',
    'tsx',
    '--test',
    '--test-concurrency=1',
    ...files.map((file) => `tests/${file}`),
  ],
  { env, stdio: 'inherit', timeout: 60_000 },
);
if (result.error)
  throw new Error('Integration test process failed or timed out');
process.exitCode = result.status ?? 1;
