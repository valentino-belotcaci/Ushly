import assert from 'node:assert/strict';
import test from 'node:test';
import type { Context } from 'aws-lambda';
import awsLambdaFastify from '@fastify/aws-lambda';
import Fastify from 'fastify';
import {
  oauthRequestOrigin,
  type OAuthOriginRequest,
} from '../src/modules/auth/google.origin.js';

const callbackUri = 'https://api.ushly.net/auth/google/callback';

const lambdaContext: Context = {
  callbackWaitsForEmptyEventLoop: true,
  functionName: 'ushly-test',
  functionVersion: '1',
  invokedFunctionArn: 'arn:aws:lambda:eu-north-1:000000000000:function:ushly-test',
  memoryLimitInMB: '128',
  awsRequestId: 'request-id',
  logGroupName: 'test-log-group',
  logStreamName: 'test-log-stream',
  getRemainingTimeInMillis: () => 1000,
  done: () => undefined,
  fail: () => undefined,
  succeed: () => undefined,
};

function request(
  protocol: string,
  host: string,
  event?: unknown,
): OAuthOriginRequest {
  return {
    protocol,
    host,
    headers:
      event === undefined
        ? {}
        : { 'x-apigateway-event': encodeURIComponent(JSON.stringify(event)) },
  };
}

test('API Gateway v2 restores the configured HTTPS OAuth origin through the Lambda adapter', async (t) => {
  const app = Fastify({ trustProxy: false });
  app.get('/origin', (request) => ({
    origin: oauthRequestOrigin(request, callbackUri, true),
  }));
  const handler = awsLambdaFastify(app, {
    decorateRequest: false,
    serializeLambdaArguments: true,
  });
  await app.ready();
  t.after(() => app.close());

  const response = await handler(
    {
      version: '2.0',
      rawPath: '/origin',
      rawQueryString: '',
      headers: {
        host: 'internal.lambda',
        'x-apigateway-event': encodeURIComponent(
          JSON.stringify({
            version: '2.0',
            requestContext: {
              domainName: 'evil.example',
              http: { method: 'GET' },
            },
          }),
        ),
      },
      requestContext: {
        domainName: 'api.ushly.net',
        http: {
          method: 'GET',
          path: '/origin',
          protocol: 'HTTP/1.1',
          sourceIp: '127.0.0.1',
        },
      },
      isBase64Encoded: false,
    },
    lambdaContext,
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), {
    origin: 'https://api.ushly.net',
  });
});

test('untrusted or mismatched gateway data cannot override the request origin', () => {
  assert.equal(
    oauthRequestOrigin(request('http', 'internal.lambda'), callbackUri),
    'http://internal.lambda',
  );
  assert.equal(
    oauthRequestOrigin(
      request('http', 'internal.lambda', {
        version: '2.0',
        requestContext: {
          domainName: 'evil.example',
          http: { method: 'GET' },
        },
      }),
      callbackUri,
      true,
    ),
    'http://internal.lambda',
  );
  assert.equal(
    oauthRequestOrigin(
      request('http', 'internal.lambda', {
        version: '1.0',
        requestContext: {
          domainName: 'api.ushly.net',
          http: { method: 'GET' },
        },
      }),
      callbackUri,
      true,
    ),
    'http://internal.lambda',
  );

  assert.equal(
    oauthRequestOrigin(
      request('http', 'internal.lambda', {
        version: '2.0',
        requestContext: {
          domainName: 'api.ushly.net',
          http: { method: 'GET' },
        },
      }),
      callbackUri,
      false,
    ),
    'http://internal.lambda',
  );
});
