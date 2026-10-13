import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { legacyFile, vaultKeyFile } from './connection.js';
import { createEncryption } from '../services/encryption.service.js';
const fingerprint = bytes => createHash('sha256').update(bytes).digest('hex');
async function readLegacy(file) {
  try { const bytes = await readFile(file); const users = JSON.parse(bytes); if (!Array.isArray(users)) throw new Error('Le fichier JSON doit contenir une liste de comptes.'); return { bytes, users }; }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
export async function needsLegacyMigration(store, source = legacyFile) {
  if (await store.migrationStatus()) return false;
  const legacy = await readLegacy(source);
  return Boolean(legacy?.users.length);
}
async function backup(file, bytes) {
  try { await writeFile(file, bytes, { flag: 'wx', mode: 0o600 }); }
  catch (error) {
    if (error.code !== 'EEXIST' || fingerprint(await readFile(file)) !== fingerprint(bytes)) throw error;
  }
}
export async function migrateJson(store, { source = legacyFile, keyFile = vaultKeyFile } = {}) {
  const previous = await store.migrationStatus();
  if (previous) return { skipped: true, users: previous.users_count, entries: previous.entries_count };
  const legacy = await readLegacy(source);
  if (!legacy?.users.length) return { empty: true, users: 0, entries: 0 };
  const hasEntries = legacy.users.some(user => user.entries?.length);
  let key;
  if (hasEntries) {
    try { key = await readFile(keyFile); } catch { throw new Error('Migration arrêtée : vault.key est indispensable pour conserver les mots de passe existants.'); }
    if (key.length !== 32) throw new Error('Migration arrêtée : clé de chiffrement invalide.');
    const encryption = createEncryption(keyFile, { hasEntries: async () => true });
    for (const user of legacy.users) for (const entry of user.entries || []) await encryption.decrypt(entry.secret, `${user.id}:${entry.id}`);
  }
  const hash = fingerprint(legacy.bytes);
  const backupDirectory = join(dirname(source), 'backups');
  await mkdir(backupDirectory, { recursive: true, mode: 0o700 });
  await backup(join(backupDirectory, `users-before-postgres-${hash.slice(0, 16)}.json`), legacy.bytes);
  if (key) await backup(join(backupDirectory, `vault-${fingerprint(key).slice(0, 16)}.key`), key);
  const result = await store.importLegacy(legacy.users, hash);
  // Le fichier d’origine et la clé restent en place. L’application n’écrit plus dans le JSON.
  return { ...result, backupDirectory };
}
