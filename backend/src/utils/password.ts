import { argon2id, hash, verify } from 'argon2';

export async function hashPassword(password: string): Promise<string> {
  // Keep passwords byte-for-byte: email normalization must never apply here.
  return hash(password, {
    type: argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
    hashLength: 32,
  });
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  // Malformed persisted hashes fail closed without exposing their contents.
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}
