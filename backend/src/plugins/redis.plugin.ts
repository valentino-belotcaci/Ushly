import { createClient, type RedisClientType } from 'redis';
import fp from 'fastify-plugin';

import { AppError } from '../errors/app-error.js';

//we need to extend the FastifyInstance interface to include 
// our Redis client and the checkRedisConnection method 
//in order to use app.redis and app.checkRedisConnection in our application
declare module 'fastify' {
  interface FastifyInstance {
    redis: RedisClientType;
    checkRedisConnection: () => Promise<void>;
  }
}

//defines the options for the Redis plugin, including the URL,
//connection timeout, maximum reconnect attempts, and base delay for reconnection
type RedisPluginOptions = {
  url: string;
  connectTimeoutMs: number;
  maxReconnectAttempts: number;
  reconnectBaseDelayMs: number;
};

//should we reconnect again to REDIS? 
//if yes, how long should we wait before trying to reconnect again?
export function getRedisReconnectDelay(
  retries: number,
  maxReconnectAttempts: number,
  baseDelayMs: number,
): number | false {
  if (retries >= maxReconnectAttempts) 
    return false;
  //exponential backoff, we wait longer each time we try to reconnect
  return Math.min(baseDelayMs * 2 ** retries, 5000);//'**' 2^retries
}

//creates a Fastify plugin that sets up a Redis client and adds it to the Fastify instance.
export default fp<RedisPluginOptions>(async (app, options) => {//fastify app and redis options
  const client = createClient({//creates a redis client that will be reused for each request
    url: options.url,
    socket: {//configures network connection
      connectTimeout: options.connectTimeoutMs,
      reconnectStrategy: (retries) =>//this function is called when the client loses connection to the Redis server and needs to reconnect
        getRedisReconnectDelay(
          retries,
          options.maxReconnectAttempts,
          options.reconnectBaseDelayMs,
        ),
    },
  });

  client.on('error', () => {//safe error when redis is down
    // Redis errors are intentionally logged without the client error or URL.
    app.log.warn('Redis connection error');
  });

  client.on('reconnecting', () => app.log.warn('Redis reconnecting'));//safe error when redis is reconnecting

  app.decorate('redis', client);//attach redis client to fastify application
  app.decorate('checkRedisConnection', async () => {//checks if redis is actually available
    if (!client.isReady) {
      throw new AppError('service_unavailable', 'Redis is unavailable', 503);
    }

    try {
      await client.ping();
    } catch {
      throw new AppError('service_unavailable', 'Redis is unavailable', 503);
    }
  });

  //run this code when the application is ready
  app.addHook('onReady', async () => {
    try {
      await client.connect();
    } catch {
      app.log.warn('Redis unavailable during application readiness');
    }
  });

  //run this code when the application being shut down
  app.addHook('onClose', async () => {
    if (client.isOpen) await client.close();
  });
}, { name: 'redis', fastify: '5.x' });
