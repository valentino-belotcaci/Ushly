import { PrismaClient } from '@prisma/client';
import fp from 'fastify-plugin';

import { AppError } from '../errors/app-error.js';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    checkDatabaseConnection: () => Promise<void>;
  }
}

type PrismaPluginOptions = {
  databaseUrl: string;
  timeoutMs: number;
};

export default fp<PrismaPluginOptions>(
  async (app, options) => {
    const prisma = new PrismaClient({
      datasources: { db: { url: options.databaseUrl } },
      // Prisma errors can contain connection details; only log safe application errors.
      log: [],
    });
    app.decorate('prisma', prisma);

    let pendingCheck: Promise<void> | undefined;
    app.decorate('checkDatabaseConnection', async () => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        // A response timeout cannot cancel a Prisma query. Share outstanding work so
        // repeated probes cannot queue unlimited queries while PostgreSQL is slow.
        pendingCheck ??= prisma.$queryRaw`SELECT 1`
          .then(() => undefined)
          .finally(() => {
            pendingCheck = undefined;
          });
        await Promise.race([
          pendingCheck,
          new Promise<never>((_resolve, reject) => {
            timer = setTimeout(
              () => reject(new Error('Readiness timeout')),
              options.timeoutMs,
            );
          }),
        ]);
      } catch {
        // Do not attach the original error as a cause: the global handler logs errors.
        throw new AppError(
          'service_unavailable',
          'Database is unavailable',
          503,
        );
      } finally {
        clearTimeout(timer);
      }
    });

    app.addHook('onReady', async () => {
      try {
        await app.checkDatabaseConnection();
      } catch {
        // Keep liveness reachable during an outage; readiness checks retry the DB.
        app.log.warn('Database unavailable during application readiness');
      }
    });

    app.addHook('onClose', async () => {
      try {
        await prisma.$disconnect();
      } catch {
        throw new Error('Failed to close database connection');
      }
    });
  },
  { name: 'prisma', fastify: '5.x' },
);
