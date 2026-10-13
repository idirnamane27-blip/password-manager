export async function requestApi(path, body, method = body === undefined ? 'GET' : 'POST') {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method, credentials: 'same-origin',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
  } catch {
    throw new Error('Le serveur est inaccessible. Vérifiez qu’il est démarré.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && !['/auth/login', '/auth/me', '/auth/register'].includes(path)) window.dispatchEvent(new Event('session-expired'));
    const error = new Error(data.message || 'Une erreur est survenue. Réessayez.');
    error.status = response.status;
    throw error;
  }
  return data;
}
export const api = (path, body, method) => requestApi(`/auth${path}`, body, method);
export const entriesApi = (path = '', body, method) => requestApi(`/entries${path}`, body, method);
