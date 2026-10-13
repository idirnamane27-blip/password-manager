import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
// Chiffrement au repos côté serveur, distinct du hachage du mot de passe maître.
export function createEncryption(keyFile, store) {
  let keyPromise;
  async function loadKey() {
    try {
      const key = await readFile(keyFile);
      if (key.length !== 32) throw new Error('Clé de chiffrement invalide.');
      return key;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      // Ne jamais remplacer une clé perdue si des entrées chiffrées existent.
      const hasEntries = await store.hasEntries();
      if (hasEntries) throw new Error('Clé du coffre absente : restaurez vault.key depuis votre sauvegarde.');
      await mkdir(dirname(keyFile), { recursive: true, mode: 0o700 });
      const key = randomBytes(32);
      try { await writeFile(keyFile, key, { flag: 'wx', mode: 0o600 }); return key; }
      catch (writeError) { if (writeError.code === 'EEXIST') return readFile(keyFile); throw writeError; }
    }
  }
  function getKey() { return keyPromise ||= loadKey().catch(error => { keyPromise = undefined; throw error; }); }
  return {
    async encrypt(password, context) {
      const key = await getKey();
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      cipher.setAAD(Buffer.from(context));
      const data = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()]);
      return { iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex'), data: data.toString('hex') };
    },
    async decrypt(secret, context) {
      const key = await getKey();
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(secret.iv, 'hex'), { authTagLength: 16 });
      decipher.setAAD(Buffer.from(context));
      decipher.setAuthTag(Buffer.from(secret.tag, 'hex'));
      return Buffer.concat([decipher.update(Buffer.from(secret.data, 'hex')), decipher.final()]).toString('utf8');
    }
  };
}
