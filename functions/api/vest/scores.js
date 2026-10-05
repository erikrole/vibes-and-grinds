import { vestScoresRoute } from '../../../shared/vest-scores.mjs';

export const onRequestGet = ({ request, env }) => vestScoresRoute(request, env.DB);
