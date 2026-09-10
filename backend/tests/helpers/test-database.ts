import type { PrismaClient } from '@prisma/client';

import { getEnvironmentConfig } from '../../src/config/env.js';

type TestEnvironment = Record<string, string | undefined>;

export function requireTestDatabase(
  input: TestEnvironment = process.env,
): string {
  if (input.NODE_ENV !== 'test') {
    throw new Error('Integration tests require NODE_ENV exactly test');
  }
  const value = input.TEST_DATABASE_URL;
  if (!value)
    throw new Error(
      'TEST_DATABASE_URL is required; no DATABASE_URL fallback is allowed',
    );
  let target: URL;
  try {
    target = new URL(value);
  } catch {
    throw new Error('Invalid TEST_DATABASE_URL');
  }
  if (
    !['postgres:', 'postgresql:'].includes(target.protocol) ||
    !['127.0.0.1', 'localhost'].includes(target.hostname) ||
    target.pathname !== '/ushly_test' ||
    !target.username ||
    !target.password ||
    target.search !== '' ||
    target.hash !== ''
  ) {
    // Query parameters can override the host/schema; allow none in this local strategy.
    throw new Error(
      'Integration tests require local PostgreSQL database ushly_test, credentials, and no URL query or fragment',
    );
  }
  if (input.DATABASE_URL !== undefined && input.DATABASE_URL !== value) {
    throw new Error('DATABASE_URL conflicts with TEST_DATABASE_URL');
  }
  return value;
}

export function getTestEnvironment(input: TestEnvironment = process.env) {
  const databaseUrl = requireTestDatabase(input);
  return getEnvironmentConfig({
    NODE_ENV: 'test',
    HOST: '127.0.0.1',
    PORT: '3000',
    DATABASE_URL: databaseUrl,
    DATABASE_READY_TIMEOUT_MS: '1000',
    REDIS_URL: 'redis://127.0.0.1:1',
    JWT_SECRET: 'test-only-secret-with-at-least-32-characters',
    COOKIE_NAME: 'session',
    COOKIE_SECURE: 'false',
    COOKIE_SAME_SITE: 'lax',
    COOKIE_MAX_AGE: '1000',
    CORS_ALLOWED_ORIGINS: 'http://localhost:5173',
  });
}

export async function cleanTestDatabase(
  prisma: PrismaClient,
  input: TestEnvironment = process.env,
): Promise<void> {
  requireTestDatabase(input);
  await prisma.$transaction(async (tx) => {
    // Verify the actual connection, not just the supplied configuration, before deleting.
    const identity = await tx.$queryRaw<{ database: string; schema: string }[]>`
      SELECT current_database() AS database, current_schema() AS schema
    `;
    if (
      identity.length !== 1 ||
      identity[0]?.database !== 'ushly_test' ||
      identity[0]?.schema !== 'public'
    ) {
      throw new Error(
        'Refusing cleanup: connected database/schema is not ushly_test/public',
      );
    }
    await tx.click.deleteMany();
    await tx.refreshToken.deleteMany();
    await tx.link.deleteMany();
    await tx.user.deleteMany();
  });
}
