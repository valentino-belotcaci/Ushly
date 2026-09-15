import cookie from '@fastify/cookie';
import type { EnvironmentConfig } from '../../config/env.js';
import { refreshControllers } from './refresh.controller.js';
import type {
  FastifyPluginAsync,
  preValidationAsyncHookHandler,
} from 'fastify';

import { AppError } from '../../errors/app-error.js';
import { registerController, loginController } from './auth.controller.js';
import {
  registerSchema,
  loginSchema,
  type RegisterBody,
} from './auth.schemas.js';

const validateCredentials: preValidationAsyncHookHandler = async (request) => {
  // Fastify's default Ajv configuration coerces scalar types. Reject them
  // before validation so a numeric password cannot silently become a string.

  const body: unknown = request.body;//unkown type because we don't know what the client will send, so we need to validate it before using it
  
  //reject requests if:
  //body doesn't exist
  //it's not an object
  //it's an array
  //it doesn't have an email property, or it's not a string
  //it doesn't have a password property, or it's not a string
  //it has any additional properties other than email and password
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    !('email' in body) ||
    typeof body.email !== 'string' ||
    !('password' in body) ||
    typeof body.password !== 'string' ||
    Object.keys(body).some((key) => key !== 'email' && key !== 'password')
  ) {
    throw new AppError('validation_error', 'Request validation failed', 400);
  }
  //remove spaces before or after email
  body.email = body.email.trim();
};

const authRoutes: FastifyPluginAsync<{ env: EnvironmentConfig }> = async (
  app,
  { env },
) => {
  await app.register(cookie);//activates for all the routes the cookie plugin to read and write cookies in the browser

  // CORS alone does not prevent writes. Reject browser origins outside the
  // deployment allowlist before accepting or issuing a session cookie.

  app.addHook('onRequest', async (request) => {// hook that runs before the request is processed, to check if the origin of the request is allowed
    
    const origin = request.headers.origin;//reads the Origin header from the request
    
    if (//this if controls if the origin is not in the list of allowed origins,
      // or if the request is a cross-site request without an origin header, it throws an error
      (origin && !env.corsAllowedOrigins.includes(origin)) ||
      (!origin && request.headers['sec-fetch-site'] === 'cross-site')
    ) {
      throw new AppError('forbidden', 'Request not allowed', 403);
    }
  });

  //creates the controllers for the refresh and logout endpoints, passing the environment configuration to them
  const controllers = refreshControllers(env);

  app.post(
    '/auth/refresh',
    {
      bodyLimit: 1024,//1kb max body size
      config: { rateLimit: { max: 30, timeWindow: 60_000 } },//max 30 requests per minute
      schema: {
        response: {
          200: {
            type: 'object',
            required: ['accessToken'],
            additionalProperties: false,
            properties: { accessToken: { type: 'string' } },//the response will be a json object with the access token
          },
        },
      },
    },
    controllers.refresh,//execute refresh token rotation and creates 
                        //a new jwt access token, and returns it to the client, while the new refresh token is stored in the httpOnly cookie
  );
  app.post('/auth/logout', { bodyLimit: 1024 }, controllers.logout);
  app.post<{ Body: RegisterBody }>(//register body is the type of the request body, in authController.ts we have defined the type RegisterBody with email and password properties
    '/auth/login',
    {
      bodyLimit: 4096,//4kb max body size
      config: { rateLimit: { max: 5, timeWindow: 60_000 } },//5 requests per minute
      schema: loginSchema,
      preValidation: validateCredentials,// 
    },
    loginController(env),//execute login, creates a new session and returns the access token and user data
  );
  app.post<{ Body: RegisterBody }>(
    '/auth/register',
    {
      bodyLimit: 4096,
      config: { rateLimit: { max: 5, timeWindow: 60_000 } },
      schema: registerSchema,
      preValidation: validateCredentials,
    },
    registerController,//creates the user and saves password hash in the database, returns user data to the client
  );
};

export default authRoutes;
