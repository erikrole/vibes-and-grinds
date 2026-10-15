import { photoProxyRoute } from '../../shared/photo-proxy.mjs';

export const onRequestGet = ({ request, env }) => photoProxyRoute(request, env);
