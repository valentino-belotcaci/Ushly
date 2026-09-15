import type { FastifyPluginAsync } from 'fastify';

import { redirectController } from './redirect.controller.js';

const redirectRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { shortCode: string } }>(
    '/:shortCode',
    {
      schema: {
        params: {
          type: 'object',
          required: ['shortCode'],
          additionalProperties: false,
          properties: {
            shortCode: {
              type: 'string',
              minLength: 1,
              maxLength: 32,
              pattern: '^[A-Za-z0-9]+$',
            },
          },
        },
      },
    },
    redirectController,
  );
};

export default redirectRoutes;
