import { visitRoute } from '../../shared/visits.mjs';
export const onRequest = ({ request, env }) => visitRoute(request, env.DB);
