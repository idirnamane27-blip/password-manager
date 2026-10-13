import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const derive = promisify(scrypt);
const options = { N: 131072, r: 8, p: 1, maxmem: 192 * 1024 * 1024 };
export async function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = await derive(password, salt, 64, options);
  return { salt, passwordHash: hash.toString('hex') };
}
export async function verifyPassword(password, user) {
  // Même calcul coûteux quand le compte n’existe pas.
  const result = await hashPassword(password, user?.salt || '00000000000000000000000000000000');
  const expected = Buffer.from(user?.passwordHash || '00'.repeat(64), 'hex');
  return timingSafeEqual(Buffer.from(result.passwordHash, 'hex'), expected) && Boolean(user);
}
