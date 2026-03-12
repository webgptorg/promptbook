import type { UserChatJobStatus } from './userChat/UserChatJobRecord';

/**
 * Dashboard tab/filter options supported by the admin task manager.
 *
 * @private internal admin utility of Agents Server
 */
export type AdminChatTaskView = 'active' | 'running' | 'queued' | 'failed' | 'all';

/**
 * Durable task kinds currently surfaced by the admin task manager.
 *
 * @private internal admin utility of Agents Server
 */
export type AdminChatTaskKind = 'CHAT_COMPLETION' | 'CHAT_TIMEOUT';

/**
 * One row shown in the admin task-manager table.
 *
 * @private internal admin utility of Agents Server
 */
export type AdminChatTaskRecord = {
    id: string;
    kind: AdminChatTaskKind;
    status: UserChatJobStatus;
    createdAt: string;
    queuedAt: string;
    startedAt: string | null;
    updatedAt: string;
    finishedAt: string | null;
    cancelRequestedAt: string | null;
    lastHeartbeatAt: string | null;
    leaseExpiresAt: string | null;
    priority: number | null;
    attemptCount: number;
    retryCount: number;
    lastErrorSummary: string | null;
    userId: number;
    username: string | null;
    agentPermanentId: string;
    agentName: string | null;
    chatId: string;
    workerId: string | null;
    queueName: string | null;
};

/**
 * Summary counters rendered above the admin task-manager table.
 *
 * @private internal admin utility of Agents Server
 */
export type AdminChatTaskCounters = {
    runningCount: number;
    queuedCount: number;
    failedLast24hCount: number;
    oldestQueuedAgeMs: number | null;
};

/**
 * Full paginated API payload returned by the admin task-manager endpoint.
 *
 * @private internal admin utility of Agents Server
 */
export type AdminChatTaskListResponse = {
    items: Array<AdminChatTaskRecord>;
    counters: AdminChatTaskCounters;
    total: number;
    page: number;
    pageSize: number;
    view: AdminChatTaskView;
    search: string;
    timeWindowHours: number;
    generatedAt: string;
};

/**
 * Query parameters accepted by the admin task-manager listing endpoint.
 *
 * @private internal admin utility of Agents Server
 */
export type AdminChatTaskListParams = {
    page?: number;
    pageSize?: number;
    view?: AdminChatTaskView;
    search?: string;
    timeWindowHours?: number;
};

/**
 * Request payload used by admin task actions that require a human reason.
 *
 * @private internal admin utility of Agents Server
 */
export type AdminChatTaskActionPayload = {
    reason: string;
};

/**
 * Builds the admin task-manager query string.
 *
 * @private internal admin utility of Agents Server
 */
function buildAdminChatTaskQuery(params: AdminChatTaskListParams): string {
    const searchParams = new URLSearchParams();

    if (params.page && params.page > 0) {
        searchParams.set('page', String(params.page));
    }
    if (params.pageSize && params.pageSize > 0) {
        searchParams.set('pageSize', String(params.pageSize));
    }
    if (params.view) {
        searchParams.set('view', params.view);
    }
    if (params.search) {
        searchParams.set('search', params.search);
    }
    if (params.timeWindowHours && params.timeWindowHours > 0) {
        searchParams.set('timeWindowHours', String(params.timeWindowHours));
    }

    const query = searchParams.toString();
    return query ? `?${query}` : '';
}

/**
 * Fetches the paginated admin task-manager payload.
 *
 * @private internal admin utility of Agents Server
 */
export async function $fetchAdminChatTasks(params: AdminChatTaskListParams = {}): Promise<AdminChatTaskListResponse> {
    const response = await fetch(`/api/admin/chat-tasks${buildAdminChatTaskQuery(params)}`, {
        method: 'GET',
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to load background chat tasks.');
    }

    return (await response.json()) as AdminChatTaskListResponse;
}

/**
 * Requests admin cancellation for one durable chat task.
 *
 * @private internal admin utility of Agents Server
 */
export async function $cancelAdminChatTask(taskId: string, payload: AdminChatTaskActionPayload): Promise<void> {
    const response = await fetch(`/api/admin/chat-tasks/${encodeURIComponent(taskId)}/cancel`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to cancel task.');
    }
}

/**
 * Requests admin retry for one failed durable chat task.
 *
 * @private internal admin utility of Agents Server
 */
export async function $retryAdminChatTask(taskId: string, payload: AdminChatTaskActionPayload): Promise<void> {
    const response = await fetch(`/api/admin/chat-tasks/${encodeURIComponent(taskId)}/retry`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to retry task.');
    }
}
