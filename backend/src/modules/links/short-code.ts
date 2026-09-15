//imports Node's cryptographically secure random byte generator.
import { randomBytes } from 'node:crypto';
import { AppError } from '../../errors/app-error.js';

//we generate short codes using a custom alphabet to avoid confusing characters 
// like 0 and O, or l and 1. This makes the codes easier to read and type.
const SHORT_CODE_ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

  //max shorctcode length
export const DEFAULT_SHORT_CODE_LENGTH = 7;
//if it happens to generate a short code that already exists, 
// we will try again up to this many times before giving up
export const DEFAULT_SHORT_CODE_MAX_ATTEMPTS = 5;


export function generateShortCode(length = DEFAULT_SHORT_CODE_LENGTH): string {

  if (!Number.isSafeInteger(length) || length < 1) {
    throw new RangeError('Short-code length must be a positive safe integer');
  }

  const bytes = randomBytes(length);//array of bytes, eg : [ 0, 255, 128, 64, 32, 16, 8 ]
  let code = '';
  for (const byte of bytes) {
    //charat(129 % 62) = charat(5) = '5'
    code += SHORT_CODE_ALPHABET.charAt(byte % SHORT_CODE_ALPHABET.length);
  }
  return code;
}

//A function that receives a short code and asynchronously saves something.
type PersistWithCode<T> = (shortCode: string) => Promise<T>;
//A function that looks at an error and tells us whether it represents a short-code uniqueness collision.
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
        throw error;//if db is unavalable, we don't retry if this happens
      }
    }
  }

  throw new AppError('short_code_unavailable', 'Unable to generate a unique short code', 503);
}

//Is this error specifically Prisma telling me that the shortCode unique constraint was violated?
function isPrismaShortCodeCollision(error: unknown): boolean {

  if (typeof error !== 'object' || error === null) 
    return false;

  if (!('code' in error) || !('meta' in error)) 
    return false;

  const candidate = error as {
    code?: unknown;
    meta?: { target?: unknown };
  };
  
  const target = candidate.meta?.target;

  //if the error code is P2002, and the target is shortCode, 
  // then this is a short code collision
  return (
    candidate.code === 'P2002' &&
    (target === 'shortCode' ||
      (Array.isArray(target) && target.includes('shortCode')))
  );
}
