import { createAuthController, httpError, publicUser } from '../controllers/auth.controller.js';
import { createSessions } from '../middleware/auth.middleware.js';
import { readBody, checkOrigin, requireUser } from '../middleware/request.js';
import { createAccountController } from '../controllers/account.controller.js';
export function createAuthRoutes(store, options = {}) {
  const controller = createAuthController(store);
  const sessions = options.sessions || createSessions(options);
  const account = createAccountController(store);
  const attempts = new Map();
  const now = options.now || Date.now;
  const limit = options.rateLimit || 20;
  function throttle(request) {
    const time = now();
    for (const [key, value] of attempts) if (time >= value.until) attempts.delete(key);
    const key = request.socket.remoteAddress;
    const attempt = attempts.get(key) || { count: 0, until: time + 15 * 60 * 1000 };
    if (attempt.count >= limit) throw httpError(429, 'Trop de tentatives. Réessayez dans 15 minutes.');
    attempt.count++; attempts.set(key, attempt);
  }
  return async (request, response) => {
    const path = new URL(request.url, 'http://localhost').pathname;
    if (request.method === 'GET' && path === '/api/auth/me') {
      const user = await requireUser(request, sessions, store);
      return { status: 200, body: { user: publicUser(user) } };
    }
    if (['/api/auth/profile', '/api/auth/password', '/api/auth/account'].includes(path)) {
      checkOrigin(request, options);
      if (!((request.method === 'PATCH' && path !== '/api/auth/account') || (request.method === 'DELETE' && path === '/api/auth/account'))) throw httpError(404, 'Route introuvable.');
      const current = await requireUser(request, sessions, store);
      throttle(request);
      const action = path.endsWith('/account') ? 'delete' : path.split('/').pop();
      const user = await account(current.id, action, await readBody(request));
      sessions.revokeUser(current.id);
      if (user) sessions.open(request, response, user); else sessions.close(request, response);
      return { status: 200, body: { user, message: user ? 'Compte mis à jour.' : 'Compte supprimé.' } };
    }
    if (request.method !== 'POST' || !['/api/auth/register', '/api/auth/login', '/api/auth/logout'].includes(path)) throw httpError(404, 'Route introuvable.');
    checkOrigin(request, options);
    if (path === '/api/auth/logout') { sessions.close(request, response); return { status: 200, body: { message: 'Déconnexion réussie.' } }; }
    throttle(request);
    const body = await readBody(request);
    const user = path.endsWith('/register') ? await controller.register(body) : await controller.login(body);
    sessions.open(request, response, user);
    return { status: path.endsWith('/register') ? 201 : 200, body: { user } };
  };
}
