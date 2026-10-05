import { ownerDataRoute } from '../../../shared/visits.mjs';
export const onRequest = ({ request, env }) => ownerDataRoute(request, env);
