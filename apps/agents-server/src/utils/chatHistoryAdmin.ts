import type { AgentsServerDatabase } from '../database/schema';

export type ChatHistoryRow = AgentsServerDatabase['public']['Tables']['ChatHistory']['Row'];
export type ChatHistorySortField = 'createdAt' | 'agentName' | 'id';
export type ChatHistorySortOrder = 'asc' | 'desc';

export type ChatHistoryListResponse = {
    items: ChatHistoryRow[];
    total: number;
    page: number;
    pageSize: number;
    sortBy: ChatHistorySortField;
    sortOrder: ChatHistorySortOrder;
};

export type ChatHistoryListParams = {
    page?: number;
    pageSize?: number;
    agentName?: string;
    search?: string;
    sortBy?: ChatHistorySortField;
    sortOrder?: ChatHistorySortOrder;
};

/**
 * Build query string for chat history listing.
 */
function buildQuery(params: ChatHistoryListParams): string {
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
 * Fetch chat history from the admin API.
 *
 * This is shared between the admin page and other admin UIs (e.g. per-agent tools)
 * to keep the API surface DRY.
 */
export async function $fetchChatHistory(params: ChatHistoryListParams = {}): Promise<ChatHistoryListResponse> {
    const qs = buildQuery(params);
    const response = await fetch(`/api/chat-history${qs}`, {
        method: 'GET',
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load chat history');
    }

    return (await response.json()) as ChatHistoryListResponse;
}

/**
 * Clear chat history for a specific agent.
 */
export async function $clearAgentChatHistory(agentName: string): Promise<void> {
    if (!agentName) {
        throw new Error('agentName is required to clear chat history');
    }

    const response = await fetch(`/api/chat-history?agentName=${encodeURIComponent(agentName)}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to clear chat history');
    }
}

/**
 * Delete a single chat history row by ID.
 */
export async function $deleteChatHistoryRow(id: number): Promise<void> {
    if (!id || id <= 0) {
        throw new Error('Valid id is required to delete chat history row');
    }

    const response = await fetch(`/api/chat-history/${encodeURIComponent(String(id))}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete chat history row');
    }
}
