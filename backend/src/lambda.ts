import awsLambdaFastify from '@fastify/aws-lambda';

import { buildApp } from './app.js';

// Module-scope initialization lets Lambda reuse Fastify, Prisma, and Redis when
// the execution environment handles more than one invocation.
const app = await buildApp();
const proxy = awsLambdaFastify(app, {
  callbackWaitsForEmptyEventLoop: false,
  decorateRequest: false,
});

await app.ready();

export const handler = proxy;
