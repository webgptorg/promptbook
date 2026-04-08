import type { AdminChatTaskView } from '../chatTasksAdmin';

/**
 * Default number of task rows returned per page.
 *
 * @private function of `getAdminChatTasksResponse`
 */
const DEFAULT_ADMIN_CHAT_TASK_PAGE_SIZE = 50;

/**
 * Maximum number of task rows returned per page.
 *
 * @private function of `getAdminChatTasksResponse`
 */
const MAX_ADMIN_CHAT_TASK_PAGE_SIZE = 200;

/**
 * Default recent-history window used by the `All` tab.
 *
 * @private function of `getAdminChatTasksResponse`
 */
const DEFAULT_ADMIN_CHAT_TASK_TIME_WINDOW_HOURS = 24;

/**
 * Upper bound for the configurable `All`-view time window.
 *
 * @private function of `getAdminChatTasksResponse`
 */
const MAX_ADMIN_CHAT_TASK_TIME_WINDOW_HOURS = 24 * 30;

/**
 * Parsed and normalized admin task-manager query params.
 *
 * @private type of `getAdminChatTasksResponse`
 */
export type ParsedAdminChatTaskQuery = {
    page: number;
    pageSize: number;
    view: AdminChatTaskView;
    search: string;
    timeWindowHours: number;
};

/**
 * Parses and normalizes the admin task-manager query string.
 *
 * @private function of `getAdminChatTasksResponse`
 */
export function parseAdminChatTaskQuery(searchParams: URLSearchParams): ParsedAdminChatTaskQuery | null {
    const view = parseAdminChatTaskView(searchParams.get('view'));
    if (!view) {
        return null;
    }

    return {
        page: parsePositiveInteger(searchParams.get('page'), 1),
        pageSize: Math.min(
            MAX_ADMIN_CHAT_TASK_PAGE_SIZE,
            parsePositiveInteger(searchParams.get('pageSize'), DEFAULT_ADMIN_CHAT_TASK_PAGE_SIZE),
        ),
        view,
        search: searchParams.get('search')?.trim() || '',
        timeWindowHours: parsePositiveInteger(
            searchParams.get('timeWindowHours'),
            DEFAULT_ADMIN_CHAT_TASK_TIME_WINDOW_HOURS,
            MAX_ADMIN_CHAT_TASK_TIME_WINDOW_HOURS,
        ),
    };
}

/**
 * Parses one positive integer query parameter with fallback and upper bound.
 *
 * @private function of `getAdminChatTasksResponse`
 */
function parsePositiveInteger(value: string | null, fallback: number, max = Number.POSITIVE_INFINITY): number {
    if (!value) {
        return fallback;
    }

    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }

    return Math.min(parsed, max);
}

/**
 * Parses the requested admin task-manager view.
 *
 * @private function of `getAdminChatTasksResponse`
 */
function parseAdminChatTaskView(value: string | null): AdminChatTaskView | null {
    if (
        value === 'active' ||
        value === 'running' ||
        value === 'queued' ||
        value === 'failed' ||
        value === 'all' ||
        value === null
    ) {
        return value || 'active';
    }

    return null;
}
