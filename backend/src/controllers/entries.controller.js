import { randomUUID } from 'node:crypto';
import { httpError } from './auth.controller.js';
export const RETENTION = 30 * 24 * 60 * 60 * 1000;
const categories = ['Travail', 'Perso', 'Banque'];
export function entryMetadata({ secret, ...entry }) { return entry; }
function validate(body) {
  const result = {};
  for (const [field, max, required] of [['title', 100, true], ['identifier', 254, true], ['password', 128, true], ['url', 2048, false]]) {
    const value = body[field] ?? (required ? undefined : '');
    if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw httpError(400, `Champ ${field} invalide.`);
    result[field] = field === 'password' ? value : value.trim();
  }
  if (result.url) {
    try { if (!['http:', 'https:'].includes(new URL(result.url).protocol)) throw new Error(); }
    catch { throw httpError(400, 'L’URL doit commencer par http:// ou https://.'); }
  }
  if (!categories.includes(body.category)) throw httpError(400, 'Choisissez une catégorie valide.');
  return { ...result, category: body.category };
}
export function createEntriesController(store, encryption, now = Date.now) {
  function change(userId, action) {
    return store.changeUser(userId, user => {
      user.entries = (user.entries || []).filter(entry => !entry.deletedAt || now() - Date.parse(entry.deletedAt) < RETENTION);
      return action(user.entries);
    });
  }
  function find(entries, id, trash = false) {
    const entry = entries.find(item => item.id === id && Boolean(item.deletedAt) === trash);
    if (!entry) throw httpError(404, 'Entrée introuvable.');
    return entry;
  }
  return {
    list(userId, trash) { return change(userId, entries => entries.filter(entry => Boolean(entry.deletedAt) === trash).map(entryMetadata)); },
    async create(userId, body) {
      const values = validate(body); const id = randomUUID();
      const secret = await encryption.encrypt(values.password, `${userId}:${id}`);
      delete values.password;
      return change(userId, entries => {
        const date = new Date(now()).toISOString();
        const entry = { id, ...values, favorite: false, secret, createdAt: date, updatedAt: date, deletedAt: null };
        entries.push(entry); return entryMetadata(entry);
      });
    },
    async update(userId, id, body) {
      const values = validate(body);
      const secret = await encryption.encrypt(values.password, `${userId}:${id}`);
      delete values.password;
      return change(userId, entries => {
        const entry = find(entries, id);
        Object.assign(entry, values, { secret, updatedAt: new Date(now()).toISOString() });
        return entryMetadata(entry);
      });
    },
    async secret(userId, id) {
      const entry = await change(userId, entries => ({ ...find(entries, id) }));
      return encryption.decrypt(entry.secret, `${userId}:${id}`);
    },
    favorite(userId, id, value) {
      if (typeof value !== 'boolean') throw httpError(400, 'Favori invalide.');
      return change(userId, entries => { const entry = find(entries, id); entry.favorite = value; entry.updatedAt = new Date(now()).toISOString(); return entryMetadata(entry); });
    },
    trash(userId, id) { return change(userId, entries => { const entry = find(entries, id); entry.deletedAt = new Date(now()).toISOString(); return entryMetadata(entry); }); },
    restore(userId, id) { return change(userId, entries => { const entry = find(entries, id, true); entry.deletedAt = null; entry.updatedAt = new Date(now()).toISOString(); return entryMetadata(entry); }); },
    erase(userId, id) { return change(userId, entries => { const entry = find(entries, id, true); entries.splice(entries.indexOf(entry), 1); }); },
    empty(userId) { return change(userId, entries => { for (let index = entries.length - 1; index >= 0; index--) if (entries[index].deletedAt) entries.splice(index, 1); }); },
    purge() { return store.purgeEntries(now() - RETENTION); }
  };
}
