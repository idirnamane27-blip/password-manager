import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import pg from 'pg';
import { createPostgresStore, createUserStore } from '../src/database/connection.js';
import { migrateJson, needsLegacyMigration } from '../src/database/migrate-json.js';
import { createAuthController } from '../src/controllers/auth.controller.js';
import { createEntriesController, RETENTION } from '../src/controllers/entries.controller.js';
import { createEncryption } from '../src/services/encryption.service.js';
import { createApp } from '../src/server.js';
const enabled = Boolean(process.env.SESAME_TEST_PG_PORT);
const account = { username: 'alex', email: 'alex@example.fr', password: 'Phrase-Maitre-2026!', confirmation: 'Phrase-Maitre-2026!' };
const entry = { title: 'GitHub', identifier: 'alex@mail.fr', password: 'Secret-Postgres-42!', url: 'https://github.com', category: 'Travail' };
async function fixture(t, options = {}) {
  const directory = await mkdtemp('/tmp/sesame-pg-fixture-');
  const config = { host: '127.0.0.1', port: Number(process.env.SESAME_TEST_PG_PORT), database: 'postgres', user: 'sesame_test', password: '' };
  const admin = new pg.Pool(config);
  const schema = `test_${randomUUID().replaceAll('-', '')}`;
  await admin.query(`CREATE SCHEMA ${schema}`);
  const store = createPostgresStore({ ...config, options: `-c search_path=${schema}` });
  await store.initialize();
  const keyFile = `${directory}/vault.key`;
  const server = createApp({ store, keyFile, ...options });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    await store.close(); await admin.query(`DROP SCHEMA ${schema} CASCADE`); await admin.end();
    await rm(directory, { recursive: true, force: true });
  });
  async function request(path, { method = 'GET', body, cookie } = {}) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
      method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie') };
  }
  async function register(username = account.username) {
    const result = await request('/auth/register', { method: 'POST', body: { ...account, username, email: `${username}@example.fr` } });
    assert.equal(result.status, 201); return result.cookie;
  }
  return { store, config, schema, directory, keyFile, request, register, admin };
}
test('PostgreSQL : inscription, coffre, isolation et reconnexion après redémarrage', { skip: !enabled }, async t => {
  const { request, register, store, keyFile, config, schema } = await fixture(t);
  const cookie = await register(); const other = await register('marie');
  assert.equal((await request('/auth/register', { method: 'POST', body: { ...account, username: 'ALEX' } })).status, 409);
  const result = await request('/entries', { method: 'POST', body: entry, cookie });
  assert.equal(result.status, 201); const id = result.body.entry.id;
  assert.equal(result.body.entry.secret, undefined);
  assert.equal((await request(`/entries/${id}/secret`, { cookie })).body.password, entry.password);
  assert.deepEqual((await request('/entries', { cookie: other })).body.entries, []);
  for (const [suffix, method, body] of [['/secret', 'GET'], ['', 'PUT', entry], ['', 'DELETE'], ['/favorite', 'PATCH', { favorite: true }]]) assert.equal((await request(`/entries/${id}${suffix}`, { cookie: other, method, body })).status, 404);
  const secondStore = createPostgresStore({ ...config, options: `-c search_path=${schema}` });
  try {
    const user = await createAuthController(secondStore).login(account);
    const secret = await createEntriesController(secondStore, createEncryption(keyFile, secondStore)).secret(user.id, id);
    assert.equal(secret, entry.password);
  } finally { await secondStore.close(); }
  assert.deepEqual(await store.counts(), { users: 2, entries: 1 });
});
test('PostgreSQL : favoris, édition, restauration, purge et vidage', { skip: !enabled }, async t => {
  let now = Date.now(); const { request, register } = await fixture(t, { now: () => now, duration: RETENTION * 2 });
  const cookie = await register();
  const id = (await request('/entries', { method: 'POST', body: entry, cookie })).body.entry.id;
  assert.equal((await request(`/entries/${id}/favorite`, { method: 'PATCH', body: { favorite: true }, cookie })).body.entry.favorite, true);
  assert.equal((await request(`/entries/${id}`, { method: 'PUT', body: { ...entry, title: 'GitLab' }, cookie })).body.entry.title, 'GitLab');
  await request(`/entries/${id}`, { method: 'DELETE', cookie });
  assert.equal((await request('/entries?trash=true', { cookie })).body.entries.length, 1);
  await request(`/entries/${id}/restore`, { method: 'POST', body: {}, cookie });
  assert.equal((await request('/entries', { cookie })).body.entries[0].favorite, true);
  await request(`/entries/${id}`, { method: 'DELETE', cookie });
  now += RETENTION;
  assert.deepEqual((await request('/entries?trash=true', { cookie })).body.entries, []);
  const fresh = (await request('/entries', { method: 'POST', body: entry, cookie })).body.entry.id;
  await request(`/entries/${fresh}`, { method: 'DELETE', cookie });
  await request('/entries/trash', { method: 'DELETE', cookie });
  assert.deepEqual((await request('/entries?trash=true', { cookie })).body.entries, []);
});
test('PostgreSQL : contraintes, rollback et inscriptions concurrentes', { skip: !enabled }, async t => {
  const { request, register, store } = await fixture(t);
  const results = await Promise.all([request('/auth/register', { method: 'POST', body: account }), request('/auth/register', { method: 'POST', body: account })]);
  assert.deepEqual(results.map(result => result.status).sort(), [201, 409]);
  await register('marie');
  const alex = await store.findByUsername('alex');
  await assert.rejects(store.changeUser(alex.id, user => { user.username = 'MARIE'; }), error => error.status === 409);
  assert.equal((await store.findById(alex.id)).username, 'alex');
  await assert.rejects(store.changeUser(alex.id, user => { user.email = 'changed@example.fr'; throw new Error('annuler'); }), /annuler/);
  assert.equal((await store.findById(alex.id)).email, account.email);
});
test('PostgreSQL : paramètres, sessions et suppression en cascade', { skip: !enabled }, async t => {
  const { request, register, store } = await fixture(t); let cookie = await register();
  await request('/entries', { method: 'POST', body: entry, cookie });
  const profile = await request('/auth/profile', { method: 'PATCH', cookie, body: { username: 'alex2', email: 'alex2@example.fr', currentPassword: account.password } });
  assert.equal(profile.status, 200); assert.equal((await request('/auth/me', { cookie })).status, 401); cookie = profile.cookie;
  const changed = await request('/auth/password', { method: 'PATCH', cookie, body: { currentPassword: account.password, password: 'Nouvelle-Phrase-2026!', confirmation: 'Nouvelle-Phrase-2026!' } });
  assert.equal(changed.status, 200); cookie = changed.cookie;
  const id = (await request('/entries', { cookie })).body.entries[0].id;
  assert.equal((await request(`/entries/${id}/secret`, { cookie })).body.password, entry.password);
  assert.equal((await request('/auth/account', { method: 'DELETE', cookie, body: { currentPassword: 'Nouvelle-Phrase-2026!', confirmation: 'SUPPRIMER' } })).status, 200);
  assert.deepEqual(await store.counts(), { users: 0, entries: 0 });
});
test('Migration JSON → PostgreSQL : sauvegarde, déchiffrement et absence de réimport', { skip: !enabled }, async t => {
  const { store, directory, keyFile } = await fixture(t);
  const source = `${directory}/users.json`;
  const legacy = createUserStore(source);
  const user = await createAuthController(legacy).register(account);
  const legacyEntries = createEntriesController(legacy, createEncryption(keyFile, legacy));
  const saved = await legacyEntries.create(user.id, entry);
  const original = await readFile(source);
  assert.equal(await needsLegacyMigration(store, source), true);
  const migrated = await migrateJson(store, { source, keyFile });
  assert.equal(migrated.users, 1); assert.equal(migrated.entries, 1);
  assert.equal(await needsLegacyMigration(store, source), false);
  assert.deepEqual(await readFile(source), original);
  const pgEntries = createEntriesController(store, createEncryption(keyFile, store));
  assert.equal(await pgEntries.secret(user.id, saved.id), entry.password);
  await pgEntries.trash(user.id, saved.id); await pgEntries.erase(user.id, saved.id);
  assert.equal((await migrateJson(store, { source, keyFile })).skipped, true);
  assert.deepEqual(await store.counts(), { users: 1, entries: 0 });
});
test('Migration : conflit atomique et clé absente refusés sans perte', { skip: !enabled }, async t => {
  const { store, directory, keyFile, register } = await fixture(t);
  const source = `${directory}/users.json`;
  const legacy = createUserStore(source);
  const user = await createAuthController(legacy).register(account);
  await register();
  await assert.rejects(migrateJson(store, { source, keyFile }), error => error.status === 409);
  assert.equal(await store.migrationStatus(), undefined);
  assert.deepEqual(await store.counts(), { users: 1, entries: 0 });
  await createEntriesController(legacy, createEncryption(keyFile, legacy)).create(user.id, entry);
  await assert.rejects(migrateJson(store, { source, keyFile: `${directory}/absent.key` }), /vault.key est indispensable/);
  assert.deepEqual(await store.counts(), { users: 1, entries: 0 });
});
