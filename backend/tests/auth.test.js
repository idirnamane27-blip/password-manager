import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/server.js';
import { createUserStore } from '../src/database/connection.js';
const account = { username: 'alex', email: 'alex@example.fr', password: 'UnePhrase-Secrete-42!', confirmation: 'UnePhrase-Secrete-42!' };
async function fixture(t, options = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'sesame-test-'));
  const file = join(directory, 'users.json');
  const server = createApp({ store: createUserStore(file), ...options });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  });
  async function request(path, body, cookie, headers = {}) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/auth${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie'), headers: response.headers };
  }
  return { request, file };
}
test('inscription, session, déconnexion, reconnexion et persistance', async t => {
  const { request, file } = await fixture(t);
  assert.equal((await request('/me')).status, 401);
  const registered = await request('/register', account);
  assert.equal(registered.status, 201);
  assert.equal(registered.body.user.username, 'alex');
  assert.equal(registered.body.user.passwordHash, undefined);
  assert.match(registered.cookie, /HttpOnly/);
  assert.match(registered.cookie, /SameSite=Strict/);
  assert.equal((await request('/me', undefined, registered.cookie)).status, 200);
  const saved = JSON.parse(await readFile(file, 'utf8'));
  assert.equal(saved.length, 1);
  assert.ok(saved[0].salt);
  assert.equal(saved[0].passwordHash.length, 128);
  assert.ok(!(await readFile(file, 'utf8')).includes(account.password));
  assert.equal((await createUserStore(file).findByUsername('ALEX')).id, registered.body.user.id);
  assert.equal((await request('/logout', {}, registered.cookie)).status, 200);
  assert.equal((await request('/me', undefined, registered.cookie)).status, 401);
  const login = await request('/login', { username: 'ALEX', password: account.password });
  assert.equal(login.status, 200);
  assert.notEqual(login.cookie, registered.cookie);
  assert.equal((await request('/me', undefined, login.cookie)).status, 200);
  const rotated = await request('/login', { username: account.username, password: account.password }, login.cookie);
  assert.equal(rotated.status, 200);
  assert.equal((await request('/me', undefined, login.cookie)).status, 401);
});
test('validation des champs et confirmation côté serveur', async t => {
  const { request } = await fixture(t);
  for (const changes of [{ username: 'a' }, { username: '<script>' }, { email: 'invalide' }, { password: 'court', confirmation: 'court' }, { confirmation: 'autre' }, { password: ' '.repeat(12), confirmation: ' '.repeat(12) }]) {
    assert.equal((await request('/register', { ...account, ...changes })).status, 400);
  }
  assert.equal((await request('/register', null)).status, 400);
  assert.equal((await request('/login', { username: [], password: 42 })).status, 400);
  assert.equal((await request('/register', account, undefined, { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await request('/register', { ...account, padding: 'x'.repeat(9000) })).status, 413);
});
test('doublons insensibles à la casse et tentatives concurrentes', async t => {
  const { request, file } = await fixture(t);
  const results = await Promise.all([request('/register', account), request('/register', account)]);
  assert.deepEqual(results.map(result => result.status).sort(), [201, 409]);
  assert.equal(JSON.parse(await readFile(file, 'utf8')).length, 1);
  assert.equal((await request('/register', { ...account, username: 'ALEX', email: 'autre@example.fr' })).status, 409);
  assert.equal((await request('/register', { ...account, username: 'autre', email: 'ALEX@EXAMPLE.FR' })).status, 409);
});
test('identifiants incorrects : même erreur, aucune session', async t => {
  const { request } = await fixture(t);
  await request('/register', account);
  const wrongPassword = await request('/login', { username: 'alex', password: 'incorrect' });
  const wrongUser = await request('/login', { username: 'inconnu', password: 'incorrect' });
  assert.equal(wrongPassword.status, 401);
  assert.deepEqual(wrongUser.body, wrongPassword.body);
  assert.equal(wrongPassword.cookie, null);
  assert.equal((await request('/me', undefined, 'sesame_session=faux')).status, 401);
});
test('expiration de session et cookie sécurisé configurable', async t => {
  let time = Date.now();
  const { request } = await fixture(t, { now: () => time, duration: 1000, secure: true });
  const registered = await request('/register', account);
  assert.match(registered.cookie, /; Secure/);
  assert.equal((await request('/me', undefined, registered.cookie)).status, 200);
  time += 1001;
  assert.equal((await request('/me', undefined, registered.cookie)).status, 401);
});
test('refus des requêtes provenant d’un autre site', async t => {
  const { request } = await fixture(t);
  assert.equal((await request('/register', account, undefined, { Origin: 'https://autre.example' })).status, 403);
  assert.equal((await request('/logout', {}, undefined, { 'Sec-Fetch-Site': 'cross-site' })).status, 403);
  assert.equal((await request('/register', account, undefined, { Origin: 'http://127.0.0.1:5173' })).status, 201);
});
test('limitation des tentatives et reprise après le délai', async t => {
  let time = Date.now();
  const { request } = await fixture(t, { rateLimit: 2, now: () => time });
  await request('/login', { username: 'inconnu', password: 'incorrect' });
  await request('/login', { username: 'inconnu', password: 'incorrect' });
  assert.equal((await request('/login', { username: 'inconnu', password: 'incorrect' })).status, 429);
  time += 15 * 60 * 1000;
  assert.equal((await request('/login', { username: 'inconnu', password: 'incorrect' })).status, 401);
});
