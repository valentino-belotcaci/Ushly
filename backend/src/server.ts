import { buildApp } from './app.js';
import { getEnvironmentConfig } from './config/env.js';

const env = getEnvironmentConfig();
const app = await buildApp({ env });

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  app.log.info({ signal }, 'Shutting down Fastify server');
  await app.close();
  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

try {
  await app.listen({ host: env.host, port: env.port });
} catch (error) {
  app.log.error(error, 'Failed to start server');
  process.exit(1);
}
