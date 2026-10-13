import { createEntriesController } from '../controllers/entries.controller.js';
import { httpError } from '../controllers/auth.controller.js';
import { readBody, checkOrigin, requireUser } from '../middleware/request.js';
export function createEntriesRoutes(store, encryption, sessions, options = {}) {
  const controller = createEntriesController(store, encryption, options.now);
  const handle = async request => {
    const url = new URL(request.url, 'http://localhost');
    const path = url.pathname;
    const user = await requireUser(request, sessions, store);
    if (request.method !== 'GET') checkOrigin(request, options);
    if (path === '/api/entries' && request.method === 'GET') return { status: 200, body: { entries: await controller.list(user.id, url.searchParams.get('trash') === 'true') } };
    if (path === '/api/entries' && request.method === 'POST') return { status: 201, body: { entry: await controller.create(user.id, await readBody(request)) } };
    if (path === '/api/entries/trash' && request.method === 'DELETE') { await controller.empty(user.id); return { status: 200, body: { message: 'Corbeille vidée.' } }; }
    const match = path.match(/^\/api\/entries\/([a-f0-9-]+)(?:\/(secret|favorite|restore))?$/);
    if (!match) throw httpError(404, 'Route introuvable.');
    const [, id, action] = match;
    if (action === 'secret' && request.method === 'GET') return { status: 200, body: { password: await controller.secret(user.id, id) } };
    if (action === 'favorite' && request.method === 'PATCH') return { status: 200, body: { entry: await controller.favorite(user.id, id, (await readBody(request)).favorite) } };
    if (action === 'restore' && request.method === 'POST') return { status: 200, body: { entry: await controller.restore(user.id, id) } };
    if (!action && request.method === 'PUT') return { status: 200, body: { entry: await controller.update(user.id, id, await readBody(request)) } };
    if (!action && request.method === 'DELETE') {
      if (url.searchParams.get('permanent') === 'true') await controller.erase(user.id, id);
      else await controller.trash(user.id, id);
      return { status: 200, body: { message: 'Entrée supprimée.' } };
    }
    throw httpError(404, 'Route introuvable.');
  };
  return { handle, purge: controller.purge };
}
