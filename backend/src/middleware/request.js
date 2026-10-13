import { httpError } from '../controllers/auth.controller.js';
export async function readBody(request) {
  if (!request.headers['content-type']?.toLowerCase().startsWith('application/json')) throw httpError(415, 'Le corps de la requête doit être au format JSON.');
  const chunks = []; let size = 0;
  for await (const chunk of request) { size += chunk.length; if (size > 8192) throw httpError(413, 'Requête trop volumineuse.'); chunks.push(chunk); }
  try { const body = JSON.parse(Buffer.concat(chunks).toString()); if (!body || Array.isArray(body) || typeof body !== 'object') throw new Error(); return body; }
  catch { throw httpError(400, 'Requête JSON invalide.'); }
}
export function checkOrigin(request, options = {}) {
  const origins = options.origins || ['http://127.0.0.1:5173', 'http://localhost:5173'];
  if ((request.headers.origin && !origins.includes(request.headers.origin)) || request.headers['sec-fetch-site'] === 'cross-site') throw httpError(403, 'Origine de la requête refusée.');
}
export async function requireUser(request, sessions, store) {
  const session = sessions.get(request);
  const user = session && await store.findById(session.id);
  if (!user || (session.authVersion || 0) !== (user.authVersion || 0)) throw httpError(401, 'Votre session a expiré. Connectez-vous à nouveau.');
  return user;
}
