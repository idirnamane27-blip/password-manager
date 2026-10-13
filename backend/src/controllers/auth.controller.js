import { randomUUID } from 'node:crypto';
import { hashPassword, verifyPassword } from '../services/password.service.js';
export function httpError(status, message) { return Object.assign(new Error(message), { status }); }
export function publicUser(user) { return { id: user.id, username: user.username, email: user.email, authVersion: user.authVersion || 0 }; }
export function createAuthController(store) {
  return {
    async register(body) {
      const { username, email, password, confirmation } = body;
      if (typeof username !== 'string' || !/^[a-zA-Z0-9_.-]{3,30}$/.test(username.trim())) throw httpError(400, 'Le nom d’utilisateur doit contenir 3 à 30 caractères : lettres, chiffres, point ou tiret.');
      if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw httpError(400, 'Saisissez une adresse e-mail valide.');
      if (typeof password !== 'string' || password.length < 12 || password.length > 128 || !password.trim()) throw httpError(400, 'Le mot de passe maître doit contenir entre 12 et 128 caractères.');
      if (password !== confirmation) throw httpError(400, 'Les deux mots de passe ne correspondent pas.');
      const credentials = await hashPassword(password);
      const user = await store.insert({ id: randomUUID(), username: username.trim(), email: email.trim().toLowerCase(), ...credentials, createdAt: new Date().toISOString() });
      return publicUser(user);
    },
    async login(body) {
      if (typeof body.username !== 'string' || body.username.length > 30 || typeof body.password !== 'string' || body.password.length > 128) throw httpError(400, 'Saisissez votre nom d’utilisateur et votre mot de passe.');
      const user = await store.findByUsername(body.username.trim());
      if (!await verifyPassword(body.password, user)) throw httpError(401, 'Nom d’utilisateur ou mot de passe incorrect.');
      const current = await store.findById(user.id);
      if (!current || current.passwordHash !== user.passwordHash) throw httpError(401, 'Nom d’utilisateur ou mot de passe incorrect.');
      return publicUser(current);
    }
  };
}
