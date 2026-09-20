import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { RedisClientType } from 'redis';
import { AppError } from '../../errors/app-error.js';

export const oauthFailure = () =>
  new AppError('oauth_failed', 'Unable to complete Google authentication', 400);
export const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex');
export const randomValue = () => randomBytes(32).toString('base64url');
export const validRandom = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
export const stateKey = (state: string) =>
  `ushly:google:state:${digest(state)}`;
export type LinkConfirmation = { userId: string; passwordFingerprint: string };
export type GoogleTransaction = {
  stateHash: string;
  verifier: string;
  nonce: string;
  createdAt: number;
  expiresAt: number;
  link: LinkConfirmation | null;
};

export function equalSecret(left: string, right: string) {
  return timingSafeEqual(Buffer.from(digest(left)), Buffer.from(digest(right)));
}

export async function saveTransaction(
  redis: RedisClientType,
  ttl: number,
  link: LinkConfirmation | null,
) {
  if (!redis.isReady)
    throw new AppError(
      'service_unavailable',
      'Authentication temporarily unavailable',
      503,
    );
  const state = randomValue();
  const createdAt = Date.now();
  const transaction: GoogleTransaction = {
    stateHash: digest(state),
    verifier: randomValue(),
    nonce: randomValue(),
    createdAt,
    expiresAt: createdAt + ttl * 1000,
    link,
  };
  const saved = await redis
    .withCommandOptions({ timeout: 2000 })
    .set(stateKey(state), JSON.stringify(transaction), { EX: ttl, NX: true });
  if (saved !== 'OK') throw oauthFailure();
  return { state, transaction };
}

function validTransaction(value: unknown): value is GoogleTransaction {
  if (!value || typeof value !== 'object') return false;
  return (
    'stateHash' in value &&
    typeof value.stateHash === 'string' &&
    /^[a-f0-9]{64}$/.test(value.stateHash) &&
    'verifier' in value &&
    validRandom(value.verifier) &&
    'nonce' in value &&
    validRandom(value.nonce) &&
    'createdAt' in value &&
    typeof value.createdAt === 'number' &&
    Number.isSafeInteger(value.createdAt) &&
    'expiresAt' in value &&
    typeof value.expiresAt === 'number' &&
    Number.isSafeInteger(value.expiresAt) &&
    value.createdAt <= Date.now() &&
    value.expiresAt > Date.now() &&
    value.expiresAt - value.createdAt <= 300_000 &&
    'link' in value &&
    (value.link === null ||
      (typeof value.link === 'object' &&
        'userId' in value.link &&
        typeof value.link.userId === 'string' &&
        value.link.userId.length > 0 &&
        'passwordFingerprint' in value.link &&
        typeof value.link.passwordFingerprint === 'string' &&
        /^[a-f0-9]{64}$/.test(value.link.passwordFingerprint)))
  );
}

export async function consumeTransaction(
  redis: RedisClientType,
  cookie: unknown,
  state: unknown,
) {
  if (!validRandom(cookie)) throw oauthFailure();
  if (!redis.isReady)
    throw new AppError(
      'service_unavailable',
      'Authentication temporarily unavailable',
      503,
    );
  // GETDEL is atomic across processes. Even cancellation or a bad callback burns this browser's attempt.
  const raw = await redis
    .withCommandOptions({ timeout: 2000 })
    .getDel(stateKey(cookie));
  if (!validRandom(state) || !equalSecret(cookie, state) || !raw)
    throw oauthFailure();
  if (raw.length > 4096) throw oauthFailure();
  const transaction: unknown = JSON.parse(raw);
  if (
    !validTransaction(transaction) ||
    !equalSecret(transaction.stateHash, digest(state))
  )
    throw oauthFailure();
  return transaction;
}
