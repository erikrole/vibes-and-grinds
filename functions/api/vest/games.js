import { vestRoute } from '../../../shared/vest.mjs';
export const onRequest = ({ request, env }) => vestRoute(request, env.DB);
