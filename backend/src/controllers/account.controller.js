import { httpError, publicUser } from './auth.controller.js';
import { hashPassword, verifyPassword } from '../services/password.service.js';
export function createAccountController(store) {
  return async (id, action, body) => store.changeUser(id, async user => {
    if (typeof body.currentPassword !== 'string' || body.currentPassword.length > 128 || !await verifyPassword(body.currentPassword, user)) throw httpError(403, 'Le mot de passe maître actuel est incorrect.');
    if (action === 'profile') {
      if (typeof body.username !== 'string' || !/^[a-zA-Z0-9_.-]{3,30}$/.test(body.username.trim())) throw httpError(400, 'Nom d’utilisateur invalide (3 à 30 caractères).');
      if (typeof body.email !== 'string' || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) throw httpError(400, 'Adresse e-mail invalide.');
      const username = body.username.trim(), email = body.email.trim().toLowerCase();
      Object.assign(user, { username, email });
    } else if (action === 'password') {
      if (typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 128 || !body.password.trim()) throw httpError(400, 'Le nouveau mot de passe doit contenir entre 12 et 128 caractères.');
      if (body.password !== body.confirmation) throw httpError(400, 'Les deux mots de passe ne correspondent pas.');
      Object.assign(user, await hashPassword(body.password));
    } else if (action === 'delete') {
      if (body.confirmation !== 'SUPPRIMER') throw httpError(400, 'Saisissez SUPPRIMER pour confirmer.');
      return null;
    }
    user.authVersion = (user.authVersion || 0) + 1;
    return publicUser(user);
  }, { remove: action === 'delete' });
}
