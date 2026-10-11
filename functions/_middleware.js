// Gate all mutating Pages Function requests behind a shared write key.
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
