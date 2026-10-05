import { ownerSession } from '../../../shared/auth.mjs';
export const onRequest = ({ request, env }) => ownerSession(request, env);
