import { createHash, randomBytes } from 'node:crypto';
const digest = token => createHash('sha256').update(token).digest('hex');
export function createSessions({ secure = false, duration = 8 * 60 * 60 * 1000, now = Date.now } = {}) {
  const sessions = new Map();
  const cookie = (token, age) => `sesame_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${secure ? '; Secure' : ''}`;
  function tokenFrom(request) {
    return (request.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith('sesame_session='))?.slice(15);
  }
  function sweep() { for (const [key, session] of sessions) if (session.expires <= now()) sessions.delete(key); }
  function revoke(request) { const token = tokenFrom(request); if (token) sessions.delete(digest(token)); }
  return {
    revokeUser(id) { for (const [key, session] of sessions) if (session.user.id === id) sessions.delete(key); },
    open(request, response, user) {
      sweep(); revoke(request);
      const token = randomBytes(32).toString('hex');
      sessions.set(digest(token), { user, expires: now() + duration });
      response.setHeader('Set-Cookie', cookie(token, Math.floor(duration / 1000)));
    },
    get(request) {
      sweep(); const token = tokenFrom(request);
      return token ? sessions.get(digest(token))?.user : undefined;
    },
    close(request, response) { revoke(request); response.setHeader('Set-Cookie', cookie('', 0)); }
  };
}
