import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
export { createUserStore } from './json-store.js'; // Réservé aux anciens tests et à la lecture du JSON.
const { Pool } = pg;
const schemaFile = fileURLToPath(new URL('./schema.sql', import.meta.url));
export const legacyFile = fileURLToPath(new URL('../../data/users.json', import.meta.url));
export const vaultKeyFile = fileURLToPath(new URL('../../data/vault.key', import.meta.url));
const migrationName = 'initial-json-import-v1';
const iso = date => date == null ? null : new Date(date).toISOString();
function userFromRow(row) {
  return row && { id: row.id, username: row.username, email: row.email, passwordHash: row.password_hash,
    salt: row.salt, authVersion: row.auth_version, createdAt: iso(row.created_at) };
}
function entryFromRow(row) {
  return { id: row.id, title: row.title, identifier: row.identifier, url: row.url, category: row.category,
    favorite: row.favorite, secret: { iv: row.secret_iv, tag: row.secret_tag, data: row.secret_data },
    createdAt: iso(row.created_at), updatedAt: iso(row.updated_at), deletedAt: iso(row.deleted_at) };
}
function translate(error) {
  if (error.code === '23505') return Object.assign(new Error('Ce nom d’utilisateur ou cette adresse e-mail est déjà utilisé.'), { status: 409 });
  return error;
}
async function writeEntry(client, userId, entry) {
  await client.query(`INSERT INTO entries
    (id, user_id, title, identifier, url, category, favorite, secret_iv, secret_tag, secret_data, created_at, updated_at, deleted_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, identifier=EXCLUDED.identifier, url=EXCLUDED.url,
      category=EXCLUDED.category, favorite=EXCLUDED.favorite, secret_iv=EXCLUDED.secret_iv,
      secret_tag=EXCLUDED.secret_tag, secret_data=EXCLUDED.secret_data,
      updated_at=EXCLUDED.updated_at, deleted_at=EXCLUDED.deleted_at
    WHERE entries.user_id = EXCLUDED.user_id`,
    [entry.id, userId, entry.title, entry.identifier, entry.url || '', entry.category, entry.favorite,
      entry.secret.iv, entry.secret.tag, entry.secret.data, entry.createdAt, entry.updatedAt, entry.deletedAt]);
}
async function insertUser(client, user) {
  await client.query(`INSERT INTO users (id, username, email, password_hash, salt, auth_version, created_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [user.id, user.username, user.email, user.passwordHash, user.salt, user.authVersion || 0, user.createdAt]);
}
export function createPostgresStore(config = {}) {
  const pool = new Pool({
    host: process.env.PGHOST || '127.0.0.1', port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || 'sesame', user: process.env.PGUSER || 'sesame_app',
    password: process.env.PGPASSWORD, max: 5, connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000, ...config
  });
  pool.on('error', error => console.error('Connexion PostgreSQL interrompue :', error.code || 'erreur de connexion'));
  async function transaction(action) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL lock_timeout = '10s'");
      const result = await action(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw translate(error);
    } finally { client.release(); }
  }
  return {
    // Même emplacement de clé que la version JSON ; aucune nouvelle clé lors de la migration.
    file: legacyFile,
    async initialize() {
      const sql = await readFile(schemaFile, 'utf8');
      await transaction(async client => {
        await client.query('SELECT pg_advisory_xact_lock(734201001)');
        await client.query(sql);
      });
    },
    async info() { return (await pool.query('SELECT current_database() AS database, current_user AS role')).rows[0]; },
    close: () => pool.end(),
    async insert(user) {
      try { await insertUser(pool, user); return user; } catch (error) { throw translate(error); }
    },
    async findById(id) { return userFromRow((await pool.query('SELECT * FROM users WHERE id=$1', [id])).rows[0]); },
    async findByUsername(username) { return userFromRow((await pool.query('SELECT * FROM users WHERE LOWER(username)=LOWER($1)', [username])).rows[0]); },
    async hasEntries() { return (await pool.query('SELECT EXISTS(SELECT 1 FROM entries) AS present')).rows[0].present; },
    changeUser(id, action, { remove = false } = {}) {
      return transaction(async client => {
        const user = userFromRow((await client.query('SELECT * FROM users WHERE id=$1 FOR UPDATE', [id])).rows[0]);
        if (!user) throw Object.assign(new Error('Votre compte n’existe plus.'), { status: 401 });
        const rows = (await client.query('SELECT * FROM entries WHERE user_id=$1 ORDER BY created_at, id FOR UPDATE', [id])).rows;
        user.entries = rows.map(entryFromRow);
        const previous = new Map(user.entries.map(entry => [entry.id, JSON.stringify(entry)]));
        const result = await action(user);
        if (remove) { await client.query('DELETE FROM users WHERE id=$1', [id]); return result; }
        await client.query(`UPDATE users SET username=$2, email=$3, password_hash=$4, salt=$5, auth_version=$6 WHERE id=$1`,
          [id, user.username, user.email, user.passwordHash, user.salt, user.authVersion || 0]);
        const currentIds = new Set(user.entries.map(entry => entry.id));
        const removed = [...previous.keys()].filter(entryId => !currentIds.has(entryId));
        if (removed.length) await client.query('DELETE FROM entries WHERE user_id=$1 AND id=ANY($2::uuid[])', [id, removed]);
        for (const entry of user.entries) {
          if (previous.get(entry.id) !== JSON.stringify(entry)) await writeEntry(client, id, entry);
        }
        return result;
      });
    },
    async purgeEntries(cutoff) { await pool.query('DELETE FROM entries WHERE deleted_at <= $1', [new Date(cutoff)]); },
    async migrationStatus() {
      return (await pool.query('SELECT * FROM app_migrations WHERE name=$1', [migrationName])).rows[0];
    },
    importLegacy(users, fingerprint) {
      return transaction(async client => {
        await client.query('SELECT pg_advisory_xact_lock(734201002)');
        const previous = (await client.query('SELECT * FROM app_migrations WHERE name=$1', [migrationName])).rows[0];
        if (previous) return { skipped: true, users: previous.users_count, entries: previous.entries_count };
        let entries = 0;
        for (const user of users) {
          await insertUser(client, user);
          for (const entry of user.entries || []) {
            // INSERT strict : aucun compte ou secret déjà présent ne sera écrasé.
            await client.query(`INSERT INTO entries
              (id,user_id,title,identifier,url,category,favorite,secret_iv,secret_tag,secret_data,created_at,updated_at,deleted_at)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
              [entry.id,user.id,entry.title,entry.identifier,entry.url || '',entry.category,entry.favorite,
                entry.secret.iv,entry.secret.tag,entry.secret.data,entry.createdAt,entry.updatedAt,entry.deletedAt]);
            entries++;
          }
        }
        await client.query('INSERT INTO app_migrations (name,source_sha256,users_count,entries_count) VALUES ($1,$2,$3,$4)',
          [migrationName, fingerprint, users.length, entries]);
        return { skipped: false, users: users.length, entries };
      });
    },
    async counts() { return (await pool.query('SELECT (SELECT COUNT(*)::int FROM users) AS users, (SELECT COUNT(*)::int FROM entries) AS entries')).rows[0]; }
  };
}
