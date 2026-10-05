import { ownerDataRoute } from '../../../../shared/visits.mjs';
export const onRequest = ({ request, env, params }) => ownerDataRoute(request, env, params.id);
