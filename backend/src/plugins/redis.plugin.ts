import { createClient, type RedisClientType } from 'redis';
import fp from 'fastify-plugin';

import { AppError } from '../errors/app-error.js';

declare module 'fastify' {
  interface FastifyInstance {
    redis: RedisClientType;
    checkRedisConnection: () => Promise<void>;
  }
}

type RedisPluginOptions = {
  url: string;
  connectTimeoutMs: number;
  maxReconnectAttempts: number;
  reconnectBaseDelayMs: number;
};

export function getRedisReconnectDelay(
  retries: number,
  maxReconnectAttempts: number,
  baseDelayMs: number,
): number | false {
  if (retries >= maxReconnectAttempts) return false;
  return Math.min(baseDelayMs * 2 ** retries, 5000);
}

export default fp<RedisPluginOptions>(async (app, options) => {
  const client = createClient({
    url: options.url,
    socket: {
      connectTimeout: options.connectTimeoutMs,
      reconnectStrategy: (retries) =>
        getRedisReconnectDelay(
          retries,
          options.maxReconnectAttempts,
          options.reconnectBaseDelayMs,
        ),
    },
  });

  client.on('error', () => {
    // Redis errors are intentionally logged without the client error or URL.
    app.log.warn('Redis connection error');
  });
  client.on('reconnecting', () => app.log.warn('Redis reconnecting'));

  app.decorate('redis', client);
  app.decorate('checkRedisConnection', async () => {
    if (!client.isReady) {
      throw new AppError('service_unavailable', 'Redis is unavailable', 503);
    }

    try {
      await client.ping();
    } catch {
      throw new AppError('service_unavailable', 'Redis is unavailable', 503);
    }
  });

  app.addHook('onReady', async () => {
    try {
      await client.connect();
    } catch {
      app.log.warn('Redis unavailable during application readiness');
    }
  });

  app.addHook('onClose', async () => {
    if (client.isOpen) await client.close();
  });
}, { name: 'redis', fastify: '5.x' });
