import crypto from 'crypto';

let argon2Module = null;
try {
  argon2Module = await import('argon2');
} catch {
  // Argon2 native module unavailable in serverless lambda environment, fallback to crypto.scrypt
}

/**
 * Hash a password using Argon2id with OWASP-recommended parameters
 * Falls back to Node.js built-in scrypt if native argon2 addon is unavailable.
 */
export async function hashPassword(plainPassword) {
  const a2 = argon2Module?.default || argon2Module;
  if (a2 && typeof a2.hash === 'function') {
    return a2.hash(plainPassword, {
      type: a2.argon2id,
      memoryCost: 65536, // 64 MiB
      timeCost: 3,       // 3 iterations
      parallelism: 1     // 1 lane
    });
  }

  // Built-in scrypt fallback
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(plainPassword, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`$scrypt$${salt}$${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Verify a plain password against an Argon2 or scrypt hash
 */
export async function verifyPassword(plainPassword, hash) {
  try {
    if (!hash || typeof hash !== 'string') return false;

    if (hash.startsWith('$scrypt$')) {
      const parts = hash.split('$');
      const salt = parts[2];
      const originalKey = parts[3];
      return new Promise((resolve) => {
        crypto.scrypt(plainPassword, salt, 64, (err, derivedKey) => {
          if (err) return resolve(false);
          resolve(crypto.timingSafeEqual(Buffer.from(originalKey, 'hex'), derivedKey));
        });
      });
    }

    const a2 = argon2Module?.default || argon2Module;
    if (a2 && typeof a2.verify === 'function') {
      return await a2.verify(hash, plainPassword);
    }

    return false;
  } catch {
    return false;
  }
}

