import type { AgentsServerDatabase } from '../database/schema';

export type ChatFeedbackRow = AgentsServerDatabase['public']['Tables']['ChatFeedback']['Row'];
export type ChatFeedbackSortField = 'createdAt' | 'agentName' | 'id';
export type ChatFeedbackSortOrder = 'asc' | 'desc';

export type ChatFeedbackListResponse = {
    items: ChatFeedbackRow[];
    total: number;
    page: number;
    pageSize: number;
    sortBy: ChatFeedbackSortField;
    sortOrder: ChatFeedbackSortOrder;
};

export type ChatFeedbackListParams = {
    page?: number;
    pageSize?: number;
    agentName?: string;
    search?: string;
    sortBy?: ChatFeedbackSortField;
    sortOrder?: ChatFeedbackSortOrder;
};

/**
 * Build query string for chat feedback listing.
 *
 * Kept in a dedicated helper so it can be shared between the
 * admin feedback page and other admin UIs (per-agent tools, etc.).
 */
function buildQuery(params: ChatFeedbackListParams): string {
    const searchParams = new URLSearchParams();

    if (params.page && params.page > 0) searchParams.set('page', String(params.page));
    if (params.pageSize && params.pageSize > 0) searchParams.set('pageSize', String(params.pageSize));
    if (params.agentName) searchParams.set('agentName', params.agentName);
    if (params.search) searchParams.set('search', params.search);
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    const qs = searchParams.toString();
    return qs ? `?${qs}` : '';
}

/**
 * Fetch chat feedback from the admin API.
 */
export async function $fetchChatFeedback(params: ChatFeedbackListParams = {}): Promise<ChatFeedbackListResponse> {
    const qs = buildQuery(params);
    const response = await fetch(`/api/chat-feedback${qs}`, {
        method: 'GET',
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load chat feedback');
    }

    return (await response.json()) as ChatFeedbackListResponse;
}

/**
 * Clear chat feedback for a specific agent.
 */
export async function $clearAgentChatFeedback(agentName: string): Promise<void> {
    if (!agentName) {
        throw new Error('agentName is required to clear chat feedback');
    }

    const response = await fetch(`/api/chat-feedback?agentName=${encodeURIComponent(agentName)}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to clear chat feedback');
    }
}

/**
 * Delete a single chat feedback row by ID.
 */
export async function $deleteChatFeedbackRow(id: number): Promise<void> {
    if (!id || id <= 0) {
        throw new Error('Valid id is required to delete chat feedback row');
    }

    const response = await fetch(`/api/chat-feedback/${encodeURIComponent(String(id))}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete chat feedback row');
    }
}
