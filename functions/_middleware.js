// Gate every mutating Pages request behind a shared write key.
// Covers POST /api/visits, PUT/DELETE /api/visits/:id, POST /api/upload,
// PUT /api/vest/games, and POST /api/vest/blurb (plus any future mutation).
// GET/HEAD/OPTIONS stay public so the personal journal remains viewable.

import {
  isWriteAuthorized,
  unauthorizedWriteResponse,
} from './api/_shared.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export async function onRequest(context) {
  const { request, next, env } = context;

  if (MUTATING_METHODS.has(request.method) && !isWriteAuthorized(request, env)) {
    return unauthorizedWriteResponse(env);
  }

  return next();
}
