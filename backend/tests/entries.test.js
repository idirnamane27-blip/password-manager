import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { createApp } from '../src/server.js';
import { createUserStore } from '../src/database/connection.js';
import { createEncryption } from '../src/services/encryption.service.js';
import { RETENTION } from '../src/controllers/entries.controller.js';
import { requireUser } from '../src/middleware/request.js';
const password = 'Phrase-Maitre-2026!';
const values = { title: 'GitHub', identifier: 'alex@mail.fr', password: 'Secret-du-coffre-42!', url: 'https://github.com', category: 'Travail' };
test('une ancienne version de session est refusée même après une connexion concurrente', async () => {
  const store = { findById: async () => ({ id: 'alex', authVersion: 2 }) };
  await assert.rejects(requireUser({}, { get: () => ({ id: 'alex', authVersion: 1 }) }, store), error => error.status === 401);
  assert.equal((await requireUser({}, { get: () => ({ id: 'alex', authVersion: 2 }) }, store)).id, 'alex');
});
async function fixture(t, options = {}) {
  const directory = await mkdtemp('/tmp/sesame-vault-test-');
  const file = join(directory, 'users.json'), keyFile = join(directory, 'vault.key');
  const store = createUserStore(file);
  const server = createApp({ store, keyFile, ...options });
  server.on('error', error => { throw error; });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  async function request(path, { method = 'GET', body, cookie, headers = {} } = {}) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie') };
  }
  async function register(username = 'alex') {
    const result = await request('/auth/register', { method: 'POST', body: { username, email: `${username}@example.fr`, password, confirmation: password } });
    assert.equal(result.status, 201); return result.cookie;
  }
  return { request, register, file, keyFile, store };
}
test('coffre : ajout, liste sans secret, lecture, édition et persistance chiffrée', async t => {
  const { request, register, file, keyFile, store } = await fixture(t);
  const cookie = await register();
  const created = await request('/entries', { method: 'POST', body: values, cookie });
  assert.equal(created.status, 201);
  const id = created.body.entry.id;
  assert.equal(created.body.entry.password, undefined);
  assert.equal(created.body.entry.secret, undefined);
  const list = await request('/entries', { cookie });
  assert.equal(list.body.entries.length, 1);
  assert.ok(!JSON.stringify(list.body).includes(values.password));
  assert.equal((await request(`/entries/${id}/secret`, { cookie })).body.password, values.password);
  const data = await readFile(file, 'utf8');
  assert.ok(!data.includes(values.password)); assert.ok(!data.includes(password));
  assert.equal((await readFile(keyFile)).length, 32);
  const saved = (await store.findByUsername('alex')).entries[0];
  const restartedEncryption = createEncryption(keyFile, createUserStore(file));
  assert.equal(await restartedEncryption.decrypt(saved.secret, `${(await store.findByUsername('alex')).id}:${id}`), values.password);
  const changed = await request(`/entries/${id}`, { method: 'PUT', cookie, body: { ...values, title: 'GitLab', password: 'Nouveau-secret-99!' } });
  assert.equal(changed.status, 200); assert.equal(changed.body.entry.title, 'GitLab');
  assert.equal((await request(`/entries/${id}/secret`, { cookie })).body.password, 'Nouveau-secret-99!');
});
test('coffres isolés : toutes les opérations refusent les entrées d’un autre compte', async t => {
  const { request, register } = await fixture(t);
  const owner = await register(), other = await register('marie');
  const id = (await request('/entries', { method: 'POST', cookie: owner, body: values })).body.entry.id;
  assert.deepEqual((await request('/entries', { cookie: other })).body.entries, []);
  assert.equal((await request('/entries')).status, 401);
  for (const [suffix, method, body] of [['/secret', 'GET'], ['', 'PUT', values], ['', 'DELETE'], ['/favorite', 'PATCH', { favorite: true }], ['/restore', 'POST', {}], ['?permanent=true', 'DELETE']]) {
    assert.equal((await request(`/entries/${id}${suffix}`, { method, body, cookie: other })).status, 404);
  }
  assert.equal((await request(`/entries/${id}/secret`, { cookie: owner })).status, 200);
});
test('favoris, corbeille, restauration, effacement et vidage', async t => {
  const { request, register } = await fixture(t); const cookie = await register();
  const id = (await request('/entries', { method: 'POST', cookie, body: values })).body.entry.id;
  assert.equal((await request(`/entries/${id}/favorite`, { method: 'PATCH', cookie, body: { favorite: true } })).body.entry.favorite, true);
  assert.equal((await request(`/entries/${id}?permanent=true`, { method: 'DELETE', cookie })).status, 404);
  await request(`/entries/${id}`, { method: 'DELETE', cookie });
  assert.deepEqual((await request('/entries', { cookie })).body.entries, []);
  assert.equal((await request('/entries?trash=true', { cookie })).body.entries.length, 1);
  assert.equal((await request(`/entries/${id}/secret`, { cookie })).status, 404);
  assert.equal((await request(`/entries/${id}/restore`, { method: 'POST', cookie, body: {} })).status, 200);
  assert.equal((await request('/entries', { cookie })).body.entries[0].favorite, true);
  await request(`/entries/${id}`, { method: 'DELETE', cookie });
  await request(`/entries/${id}?permanent=true`, { method: 'DELETE', cookie });
  assert.deepEqual((await request('/entries?trash=true', { cookie })).body.entries, []);
  await request('/entries', { method: 'POST', cookie, body: values });
  const second = (await request('/entries', { method: 'POST', cookie, body: { ...values, title: 'Netflix' } })).body.entry.id;
  await request(`/entries/${second}`, { method: 'DELETE', cookie });
  await request('/entries/trash', { method: 'DELETE', cookie });
  assert.equal((await request('/entries', { cookie })).body.entries.length, 1);
  assert.deepEqual((await request('/entries?trash=true', { cookie })).body.entries, []);
});
test('rétention : récupération avant 30 jours, purge effective à l’échéance', async t => {
  let time = Date.now(); const { request, register, file } = await fixture(t, { now: () => time, duration: RETENTION * 2 });
  const cookie = await register();
  const id = (await request('/entries', { method: 'POST', cookie, body: values })).body.entry.id;
  await request(`/entries/${id}`, { method: 'DELETE', cookie });
  time += RETENTION - 1;
  assert.equal((await request('/entries?trash=true', { cookie })).body.entries.length, 1);
  time += 1;
  assert.deepEqual((await request('/entries?trash=true', { cookie })).body.entries, []);
  assert.equal((await request(`/entries/${id}/restore`, { method: 'POST', cookie, body: {} })).status, 404);
  assert.ok(!(await readFile(file, 'utf8')).includes(id));
});
test('validation, protocoles URL et protection des mutations contre les sites tiers', async t => {
  const { request, register } = await fixture(t); const cookie = await register();
  for (const change of [{ title: '' }, { identifier: '' }, { password: '' }, { category: 'inconnue' }, { url: 'javascript:alert(1)' }, { title: 'x'.repeat(101) }]) assert.equal((await request('/entries', { method: 'POST', cookie, body: { ...values, ...change } })).status, 400);
  assert.equal((await request('/entries', { method: 'POST', cookie, body: values, headers: { Origin: 'https://intrus.example' } })).status, 403);
  assert.equal((await request('/entries/trash', { method: 'DELETE', cookie, headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
});
test('profil et mot de passe : validation, nouvelles sessions et conservation du coffre', async t => {
  const { request, register } = await fixture(t); let cookie = await register();
  const second = await request('/auth/login', { method: 'POST', body: { username: 'alex', password } });
  const id = (await request('/entries', { method: 'POST', cookie, body: values })).body.entry.id;
  assert.equal((await request('/auth/profile', { method: 'PATCH', cookie, body: { username: 'alex2', email: 'autre@example.fr', currentPassword: 'incorrect' } })).status, 403);
  const profile = await request('/auth/profile', { method: 'PATCH', cookie, body: { username: 'alex2', email: 'autre@example.fr', currentPassword: password } });
  assert.equal(profile.status, 200); cookie = profile.cookie;
  assert.equal((await request('/auth/me', { cookie: second.cookie })).status, 401);
  assert.equal((await request('/auth/me', { cookie })).body.user.username, 'alex2');
  const changed = await request('/auth/password', { method: 'PATCH', cookie, body: { currentPassword: password, password: 'Autre-Phrase-Maitre-2026!', confirmation: 'Autre-Phrase-Maitre-2026!' } });
  assert.equal(changed.status, 200);
  assert.equal((await request('/auth/me', { cookie })).status, 401);
  cookie = changed.cookie;
  assert.equal((await request(`/entries/${id}/secret`, { cookie })).body.password, values.password);
  assert.equal((await request('/auth/login', { method: 'POST', body: { username: 'alex2', password } })).status, 401);
  assert.equal((await request('/auth/login', { method: 'POST', body: { username: 'alex2', password: 'Autre-Phrase-Maitre-2026!' } })).status, 200);
});
test('suppression de compte confirmée : toutes les entrées et sessions sont supprimées', async t => {
  const { request, register, file } = await fixture(t); const cookie = await register();
  const other = await register('marie');
  const id = (await request('/entries', { method: 'POST', cookie, body: values })).body.entry.id;
  const path = '/auth/account';
  assert.equal((await request(path, { method: 'DELETE', cookie, body: { currentPassword: password, confirmation: 'non' } })).status, 400);
  assert.equal((await request(path, { method: 'DELETE', cookie, body: { currentPassword: 'incorrect', confirmation: 'SUPPRIMER' } })).status, 403);
  assert.equal((await request(path, { method: 'DELETE', cookie, body: { currentPassword: password, confirmation: 'SUPPRIMER' } })).status, 200);
  assert.equal((await request('/auth/me', { cookie })).status, 401);
  assert.equal((await request('/auth/me', { cookie: other })).status, 200);
  assert.ok(!(await readFile(file, 'utf8')).includes(id));
  assert.equal(JSON.parse(await readFile(file, 'utf8')).length, 1);
});
test('chiffrement authentifié : altération, mauvais propriétaire et clé absente refusés', async t => {
  const { request, register, store, keyFile } = await fixture(t); const cookie = await register();
  const id = (await request('/entries', { method: 'POST', cookie, body: values })).body.entry.id;
  const user = await store.findByUsername('alex'); const secret = user.entries[0].secret;
  const encryption = createEncryption(keyFile, store);
  await assert.rejects(encryption.decrypt(secret, `autre:${id}`));
  const tampered = { ...secret, tag: '00'.repeat(16) };
  await assert.rejects(encryption.decrypt(tampered, `${user.id}:${id}`));
  await unlink(keyFile);
  const lostKey = createEncryption(keyFile, store);
  await assert.rejects(lostKey.decrypt(secret, `${user.id}:${id}`), /Clé du coffre absente/);
});
