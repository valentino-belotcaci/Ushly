import { randomBytes } from 'node:crypto';
import { AppError } from '../../errors/app-error.js';

const SHORT_CODE_ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
export const DEFAULT_SHORT_CODE_LENGTH = 7;
export const DEFAULT_SHORT_CODE_MAX_ATTEMPTS = 5;

export function generateShortCode(length = DEFAULT_SHORT_CODE_LENGTH): string {
  if (!Number.isSafeInteger(length) || length < 1) {
    throw new RangeError('Short-code length must be a positive safe integer');
  }

  const bytes = randomBytes(length);
  let code = '';
  for (const byte of bytes) {
    code += SHORT_CODE_ALPHABET.charAt(byte % SHORT_CODE_ALPHABET.length);
  }
  return code;
}

type PersistWithCode<T> = (shortCode: string) => Promise<T>;
type IsUniqueCollision = (error: unknown) => boolean;

export async function createWithUniqueShortCode<T>(
  persist: PersistWithCode<T>,
  options: {
    maxAttempts?: number;
    generate?: () => string;
    isUniqueCollision?: IsUniqueCollision;
  } = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_SHORT_CODE_MAX_ATTEMPTS;
  const generate = options.generate ?? generateShortCode;
  const isUniqueCollision =
    options.isUniqueCollision ?? isPrismaShortCodeCollision;

  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1) {
    throw new RangeError('Short-code attempts must be a positive safe integer');
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await persist(generate());
    } catch (error) {
      if (!isUniqueCollision(error) || attempt === maxAttempts - 1) {
        if (isUniqueCollision(error) && attempt === maxAttempts - 1) {
          throw new AppError(
            'short_code_unavailable',
            'Unable to generate a unique short code',
            503,
          );
        }
        throw error;
      }
    }
  }

  throw new AppError('short_code_unavailable', 'Unable to generate a unique short code', 503);
}

function isPrismaShortCodeCollision(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  if (!('code' in error) || !('meta' in error)) return false;
  const candidate = error as {
    code?: unknown;
    meta?: { target?: unknown };
  };
  const target = candidate.meta?.target;
  return (
    candidate.code === 'P2002' &&
    (target === 'shortCode' ||
      (Array.isArray(target) && target.includes('shortCode')))
  );
}
