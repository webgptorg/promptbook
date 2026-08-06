import type { AgentMessageRunReport } from '../../../../src/book-3.0/AgentMessageRunReport';
import type { UserChatJobStatus } from './userChat/UserChatJobRecord';

/**
 * Dashboard tab/filter options supported by the admin task manager.
 *
 * @private internal admin utility of Agents Server
 */
export type AdminChatTaskView = 'active' | 'running' | 'queued' | 'failed' | 'all';

/**
 * Sortable task-manager columns supported by the admin API.
 *
 * `default` keeps the operational order chosen for the active dashboard view.
 *
 * @private internal admin utility of Agents Server
 */
export type AdminChatTaskSortField = 'default' | 'task' | 'ownership' | 'timeline' | 'duration' | 'queue' | 'lastError';

/**
 * Sort direction supported by the admin task-manager API.
 *
 * @private internal admin utility of Agents Server
 */
export type AdminChatTaskSortOrder = 'asc' | 'desc';

/**
 * Durable task kinds currently surfaced by the admin task manager.
 *
 * `VPS_SELF_UPDATE` represents a manual or automatic standalone VPS self-update session.
 * `BROWSER_PREVIEW` represents an ephemeral live browser stream used by citation previews.
 * `VPS_SERVER_SETUP` represents VPS server bootstrap and certificate maintenance.
 *
 * @private internal admin utility of Agents Server
 */
export type AdminChatTaskKind =
    | 'CHAT_COMPLETION'
    | 'CHAT_TIMEOUT'
    | 'VPS_SELF_UPDATE'
    | 'VPS_SERVER_SETUP'
    | 'BROWSER_PREVIEW';

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
    pausedAt: string | null;
    lastHeartbeatAt: string | null;
    leaseExpiresAt: string | null;
    recurrenceIntervalMs: number | null;
    priority: number | null;
    attemptCount: number;
    retryCount: number;
    lastErrorSummary: string | null;
    lastErrorDetails: string | null;
    userId: number;
    username: string | null;
    agentPermanentId: string;
    agentName: string | null;
    chatId: string;
    workerId: string | null;
    queueName: string | null;

    /**
     * True when the task runs in the agent's own goal chat instead of a chat started by a user.
     *
     * Goal-chat tasks keep their normal kind (they really are chat completions / chat timeouts) and
     * are only flagged, so they stay in the regular task streams while remaining distinguishable
     * from user-invoked work.
     */
    isAgentGoalTask?: boolean;

    /**
     * Registered server this task belongs to, when the source task is bound to one server or the
     * VPS-wide superadmin aggregation adds the owning server.
     *
     * `null` (or absent) means the per-server view, or a VPS-level task not bound to any one server.
     */
    serverName?: string | null;

    /**
     * Domain of the registered server this task belongs to, set only by the VPS-wide superadmin aggregation.
     */
    serverDomain?: string | null;

    /**
     * Harness run report of the answered turn (runner, model, Codex login method, usage), when the runner reported one.
     */
    runReport?: AgentMessageRunReport | null;
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
    sortBy: AdminChatTaskSortField;
    sortOrder: AdminChatTaskSortOrder;
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
    sortBy?: AdminChatTaskSortField;
    sortOrder?: AdminChatTaskSortOrder;
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
 * Summary returned after bulk-cancelling every active durable chat task.
 *
 * @private internal admin utility of Agents Server
 */
export type CancelAllAdminChatTasksSummary = {
    matchedCount: number;
    cancelledCount: number;
    hasMore: boolean;
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
    if (params.sortBy) {
        searchParams.set('sortBy', params.sortBy);
    }
    if (params.sortOrder) {
        searchParams.set('sortOrder', params.sortOrder);
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
 * Fetches the paginated task-manager payload aggregated across every server on the VPS.
 *
 * Superadmin-only companion to `$fetchAdminChatTasks`; each task carries its `serverName`/`serverDomain`.
 *
 * @private internal admin utility of Agents Server
 */
export async function $fetchVpsAdminChatTasks(
    params: AdminChatTaskListParams = {},
): Promise<AdminChatTaskListResponse> {
    const response = await fetch(`/api/admin/vps/chat-tasks${buildAdminChatTaskQuery(params)}`, {
        method: 'GET',
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to load VPS-wide background chat tasks.');
    }

    return (await response.json()) as AdminChatTaskListResponse;
}

/**
 * Fetches one durable background task for the admin task detail page.
 *
 * @private internal admin utility of Agents Server
 */
export async function $fetchAdminChatTask(taskId: string, serverDomain?: string | null): Promise<AdminChatTaskRecord> {
    const response = await fetch(
        `/api/admin/chat-tasks/${encodeURIComponent(taskId)}${buildServerDomainQuery(serverDomain)}`,
        {
            method: 'GET',
        },
    );

    const payload = (await response.json().catch(() => ({}))) as { task?: AdminChatTaskRecord; error?: string };
    if (!response.ok || !payload.task) {
        throw new Error(payload.error || 'Failed to load the background task.');
    }

    return payload.task;
}

/**
 * Requests admin cancellation for one durable chat task.
 *
 * @private internal admin utility of Agents Server
 */
export async function $cancelAdminChatTask(
    taskId: string,
    payload: AdminChatTaskActionPayload,
    serverDomain?: string | null,
): Promise<void> {
    const response = await fetch(
        `/api/admin/chat-tasks/${encodeURIComponent(taskId)}/cancel${buildServerDomainQuery(serverDomain)}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        },
    );

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
export async function $retryAdminChatTask(
    taskId: string,
    payload: AdminChatTaskActionPayload,
    serverDomain?: string | null,
): Promise<void> {
    const response = await fetch(
        `/api/admin/chat-tasks/${encodeURIComponent(taskId)}/retry${buildServerDomainQuery(serverDomain)}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        },
    );

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to retry task.');
    }
}

/**
 * Requests admin cancellation for every active durable chat task at once.
 *
 * @private internal admin utility of Agents Server
 */
export async function $cancelAllAdminChatTasks(
    payload: AdminChatTaskActionPayload,
    isVpsScope = false,
): Promise<CancelAllAdminChatTasksSummary> {
    const cancelAllPath = isVpsScope ? '/api/admin/vps/chat-tasks/cancel-all' : '/api/admin/chat-tasks/cancel-all';
    const response = await fetch(cancelAllPath, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    const data = (await response.json().catch(() => ({}))) as Partial<CancelAllAdminChatTasksSummary> & {
        error?: string;
    };

    if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel all tasks.');
    }

    return {
        matchedCount: data.matchedCount ?? 0,
        cancelledCount: data.cancelledCount ?? 0,
        hasMore: data.hasMore ?? false,
    };
}

/**
 * Builds the optional owning-server query used by VPS-wide task actions.
 *
 * @param serverDomain - Owning server domain, when the task came from the VPS-wide listing.
 * @returns Encoded query string or an empty string.
 *
 * @private function of Agents Server admin task utilities
 */
function buildServerDomainQuery(serverDomain?: string | null): string {
    return serverDomain ? `?serverDomain=${encodeURIComponent(serverDomain)}` : '';
}
