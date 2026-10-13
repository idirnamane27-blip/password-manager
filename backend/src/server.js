import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import './config/env.js';
import { createPostgresStore } from './database/connection.js';
import { needsLegacyMigration } from './database/migrate-json.js';
import { createAuthRoutes } from './routes/auth.routes.js';
import { createSessions } from './middleware/auth.middleware.js';
import { createEntriesRoutes } from './routes/entries.routes.js';
import { createEncryption } from './services/encryption.service.js';
import { join, dirname } from 'node:path';
export function createApp(options = {}) {
  const store = options.store || createPostgresStore();
  const sessions = createSessions(options);
  const routes = createAuthRoutes(store, { ...options, sessions });
  const encryption = createEncryption(options.keyFile || join(dirname(store.file), 'vault.key'), store);
  const entries = createEntriesRoutes(store, encryption, sessions, options);
  const server = createServer(async (request, response) => {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    try { const result = new URL(request.url, 'http://localhost').pathname.startsWith('/api/entries')
        ? await entries.handle(request) : await routes(request, response); response.writeHead(result.status); response.end(JSON.stringify(result.body)); }
    catch (error) {
      if (!error.status) console.error('Erreur interne :', error.message);
      response.writeHead(error.status || 500);
      response.end(JSON.stringify({ message: error.status ? error.message : 'Erreur du serveur. Réessayez plus tard.' }));
    }
  });
  server.requestTimeout = 15000;
  // Purge effective au démarrage, puis toutes les heures, en plus des accès au coffre.
  const cleanup = () => entries.purge().catch(error => console.error('Purge impossible :', error.message));
  let timer;
  server.on('listening', () => { cleanup(); timer = setInterval(cleanup, 60 * 60 * 1000); timer.unref(); });
  server.on('close', () => clearInterval(timer));
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const store = createPostgresStore();
  try {
    if (!process.env.PGPASSWORD) throw new Error('Renseignez PGPASSWORD dans backend/.env puis lancez npm run db:setup.');
    await store.initialize();
    if (await needsLegacyMigration(store)) throw new Error('Des données JSON restent à importer. Lancez npm run db:setup avant npm start.');
  } catch (error) {
    console.error('Démarrage impossible :', error.code === '28P01' ? 'Mot de passe PostgreSQL incorrect dans backend/.env.' : error.code ? `Connexion PostgreSQL impossible (${error.code}). Lancez npm run db:setup.` : error.message);
    await store.close(); process.exit(1);
  }
  const server = createApp({
    store,
    secure: process.env.COOKIE_SECURE === 'true',
    ...(process.env.APP_ORIGIN ? { origins: [process.env.APP_ORIGIN] } : {})
  });
  server.listen(Number(process.env.PORT || 3001), '127.0.0.1', () => console.log('API Sésame (PostgreSQL) : http://127.0.0.1:' + (process.env.PORT || 3001)));
  server.on('error', async error => { console.error(error.message); await store.close(); process.exitCode = 1; });
  const stop = () => server.close(async () => { await store.close(); process.exit(0); });
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
}
