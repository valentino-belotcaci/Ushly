import { createHash } from 'node:crypto';
import { CodeChallengeMethod, OAuth2Client } from 'google-auth-library';
import type { GoogleOAuthConfig } from '../../config/env.js';
import {
  equalSecret,
  oauthFailure,
  type GoogleTransaction,
} from './google.state.js';

export type GoogleIdentity = { subject: string; email: string };

export function googleClient(config: GoogleOAuthConfig) {
  const client = new OAuth2Client({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri: config.redirectUri,
    transporterOptions: { timeout: 5000, retry: false },
  });
  // The SDK enables retries per request; override that for single-use authorization codes.
  client.transporter.interceptors.request.add({
    resolved: async (options) => {
      options.retry = false;
      options.timeout = 5000;
      options.maxRedirects = 0;
      return options;
    },
  });
  return client;
}

export function authorizationUrl(
  client: OAuth2Client,
  state: string,
  transaction: GoogleTransaction,
) {
  return client.generateAuthUrl({
    scope: ['openid', 'email'],
    access_type: 'online',
    prompt: 'select_account',
    state,
    nonce: transaction.nonce,
    code_challenge_method: CodeChallengeMethod.S256,
    code_challenge: createHash('sha256')
      .update(transaction.verifier)
      .digest('base64url'),
  });
}

export function validateGoogleClaims(
  value: unknown,
  config: GoogleOAuthConfig,
  nonce: string,
): GoogleIdentity {
  if (
    !value ||
    typeof value !== 'object' ||
    !('iss' in value) ||
    typeof value.iss !== 'string' ||
    !['https://accounts.google.com', 'accounts.google.com'].includes(
      value.iss,
    ) ||
    !('aud' in value) ||
    value.aud !== config.clientId ||
    ('azp' in value && value.azp !== config.clientId) ||
    !('sub' in value) ||
    typeof value.sub !== 'string' ||
    !/^[!-~]{1,255}$/.test(value.sub) ||
    !('email' in value) ||
    typeof value.email !== 'string' ||
    value.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email) ||
    !('email_verified' in value) ||
    value.email_verified !== true ||
    !('nonce' in value) ||
    typeof value.nonce !== 'string' ||
    !equalSecret(value.nonce, nonce) ||
    !('iat' in value) ||
    typeof value.iat !== 'number' ||
    !Number.isInteger(value.iat) ||
    value.iat > Date.now() / 1000 + 60 ||
    !('exp' in value) ||
    typeof value.exp !== 'number' ||
    !Number.isInteger(value.exp) ||
    value.exp <= Date.now() / 1000 ||
    value.exp <= value.iat ||
    value.exp - value.iat > 86400
  ) {
    throw oauthFailure();
  }
  return { subject: value.sub, email: value.email.toLowerCase() };
}

export async function exchangeIdentity(
  client: OAuth2Client,
  config: GoogleOAuthConfig,
  code: string,
  transaction: GoogleTransaction,
) {
  // Do not retain credentials on the client: no Google API access or offline access is needed.
  const { tokens } = await client.getToken({
    code,
    codeVerifier: transaction.verifier,
    redirect_uri: config.redirectUri,
  });
  if (typeof tokens.id_token !== 'string' || !tokens.id_token)
    throw oauthFailure();
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: config.clientId,
  });
  return validateGoogleClaims(ticket.getPayload(), config, transaction.nonce);
}
