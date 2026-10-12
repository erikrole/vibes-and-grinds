import { vestScheduleRoute } from '../../../shared/vest-schedule.mjs';

export const onRequestGet = ({ request }) => vestScheduleRoute(request);
