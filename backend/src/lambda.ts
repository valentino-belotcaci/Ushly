import awsLambdaFastify from '@fastify/aws-lambda';

import { buildApp } from './app.js';

// Module-scope initialization lets Lambda reuse Fastify, Prisma, and Redis when
// the execution environment handles more than one invocation.
const app = await buildApp({ lambdaRuntime: true });
const proxy = awsLambdaFastify(app, {
  callbackWaitsForEmptyEventLoop: false,
  // Keep the previously working request-decoration path disabled. The adapter
  // strips client-supplied reserved headers before serializing the real event.
  decorateRequest: false,
  serializeLambdaArguments: true,
});

await app.ready();

export const handler = proxy;
