import { gamesRoute } from '../../shared/badger-schedule.mjs';

export const onRequestGet = ({ request }) => gamesRoute(request);
