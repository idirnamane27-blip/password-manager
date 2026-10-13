import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
// Stockage local pour le TP ; aucun mot de passe en clair dans ce fichier.
export function createUserStore(file = fileURLToPath(new URL('../../data/users.json', import.meta.url))) {
  let queue = Promise.resolve();
  async function readUsers() {
    try { return JSON.parse(await readFile(file, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  }
  function transaction(change) {
    const operation = queue.then(async () => {
      const users = await readUsers();
      const result = await change(users);
      await mkdir(dirname(file), { recursive: true, mode: 0o700 });
      await writeFile(`${file}.tmp`, JSON.stringify(users, null, 2), { mode: 0o600 });
      await rename(`${file}.tmp`, file);
      return result;
    });
    queue = operation.catch(() => {});
    return operation;
  }
  return {
    file,
    insert(user) { return transaction(users => {
      if (users.some(existing => existing.username.toLowerCase() === user.username.toLowerCase() || existing.email === user.email)) {
        throw Object.assign(new Error('Ce nom d’utilisateur ou cette adresse e-mail est déjà utilisé.'), { status: 409 });
      }
      users.push(user); return user;
    }); },
    transaction,
    changeUser(id, action, { remove = false } = {}) { return transaction(async users => {
      const user = users.find(item => item.id === id);
      if (!user) throw Object.assign(new Error('Votre compte n’existe plus.'), { status: 401 });
      const result = await action(user);
      if (remove) users.splice(users.indexOf(user), 1);
      else if (users.some(item => item.id !== id && (item.username.toLowerCase() === user.username.toLowerCase() || item.email.toLowerCase() === user.email.toLowerCase()))) {
        throw Object.assign(new Error('Ce nom d’utilisateur ou cette adresse e-mail est déjà utilisé.'), { status: 409 });
      }
      return result;
    }); },
    purgeEntries(cutoff) { return transaction(users => {
      for (const user of users) if (user.entries) user.entries = user.entries.filter(entry => !entry.deletedAt || Date.parse(entry.deletedAt) > cutoff);
    }); },
    async hasEntries() { await queue; return (await readUsers()).some(user => user.entries?.length); },
    async findById(id) { await queue; return (await readUsers()).find(user => user.id === id); },
    async findByUsername(username) { await queue; return (await readUsers()).find(user => user.username.toLowerCase() === username.toLowerCase()); }
  };
}
