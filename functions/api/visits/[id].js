import { visitRoute } from '../../../shared/visits.mjs';
export const onRequest = ({ request, env, params }) => visitRoute(request, env.DB, params.id);
