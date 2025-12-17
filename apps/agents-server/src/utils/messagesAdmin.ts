import type { Json } from '../database/schema';

export type MessageRow = {
    id: number;
    createdAt: string;
    channel: string;
    direction: string;
    sender: Json;
    recipients: Json;
    content: string;
    threadId: string | null;
    metadata: Json;
    // Joined fields
    sendAttempts?: MessageSendAttemptRow[];
};

export type MessageSendAttemptRow = {
    id: number;
    createdAt: string;
    messageId: number;
    providerName: string;
    isSuccessful: boolean;
    raw: Json;
};

export type MessagesListResponse = {
    items: MessageRow[];
    total: number;
    page: number;
    pageSize: number;
};

export type MessagesListParams = {
    page?: number;
    pageSize?: number;
    search?: string;
    channel?: string;
    direction?: string;
};

/**
 * Build query string for messages listing.
 */
function buildQuery(params: MessagesListParams): string {
    const searchParams = new URLSearchParams();

    if (params.page && params.page > 0) searchParams.set('page', String(params.page));
    if (params.pageSize && params.pageSize > 0) searchParams.set('pageSize', String(params.pageSize));
    if (params.search) searchParams.set('search', params.search);
    if (params.channel) searchParams.set('channel', params.channel);
    if (params.direction) searchParams.set('direction', params.direction);

    const qs = searchParams.toString();
    return qs ? `?${qs}` : '';
}

/**
 * Fetch messages from the admin API.
 */
export async function $fetchMessages(params: MessagesListParams = {}): Promise<MessagesListResponse> {
    const qs = buildQuery(params);
    const response = await fetch(`/api/messages${qs}`, {
        method: 'GET',
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load messages');
    }

    return (await response.json()) as MessagesListResponse;
}
