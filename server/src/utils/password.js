import argon2 from 'argon2';

/**
 * Hash a password using Argon2id with OWASP-recommended parameters
 */
export async function hashPassword(plainPassword) {
  return argon2.hash(plainPassword, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MiB
    timeCost: 3,       // 3 iterations
    parallelism: 1     // 1 lane
  });
}

/**
 * Verify a plain password against an Argon2 hash
 */
export async function verifyPassword(plainPassword, hash) {
  try {
    return await argon2.verify(hash, plainPassword);
  } catch {
    return false;
  }
}

