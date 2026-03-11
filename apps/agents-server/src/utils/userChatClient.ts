'use client';

import type { ChatMessage } from '@promptbook-local/types';

/**
 * Header carrying stable anonymous username for user-chat API calls.
 */
const ANONYMOUS_USERNAME_HEADER_NAME = 'x-anonymous-username';

/**
 * Browser storage key for stable anonymous username across refreshes.
 */
const ANONYMOUS_USERNAME_STORAGE_KEY = 'agents-server-anonymous-username';

/**
 * Prefix used by server-side anonymous user validation.
 */
const ANONYMOUS_USERNAME_PREFIX = 'anonymous-';

/**
 * Number of random base58 characters appended to anonymous username prefix.
 */
const ANONYMOUS_USERNAME_SUFFIX_LENGTH = 14;

/**
 * Base58 alphabet used by anonymous user IDs.
 */
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Pattern accepted by server-side anonymous username validator.
 */
const ANONYMOUS_USERNAME_PATTERN = /^anonymous-[1-9A-HJ-NP-Za-km-z]{14}$/;

/**
 * Optional fetch configuration for chat-save requests.
 */
export type UserChatSaveRequestOptions = {
    /**
     * Enables keepalive mode so save requests can continue during page unload.
     */
    keepalive?: boolean;
};

/**
 * Structured payload returned by user-chat API errors.
 */
type UserChatApiErrorPayload = {
    error?: unknown;
    code?: unknown;
    details?: unknown;
};

/**
 * Error thrown for failed user-chat API requests with status/code/details metadata.
 */
export class UserChatApiError extends Error {
    /**
     * HTTP status returned by the API endpoint.
     */
    public readonly status: number;

    /**
     * Optional machine-readable API code.
     */
    public readonly code: string | null;

    /**
     * Optional structured API details payload.
     */
    public readonly details: unknown;

    /**
     * API URL that produced the error response.
     */
    public readonly url: string;

    /**
     * Creates one user-chat API error value.
     */
    public constructor(
        message: string,
        options: {
            status: number;
            code: string | null;
            details: unknown;
            url: string;
        },
    ) {
        super(message);
        this.name = 'UserChatApiError';
        this.status = options.status;
        this.code = options.code;
        this.details = options.details;
        this.url = options.url;
    }
}

/**
 * Cached anonymous username resolved in current browser tab.
 */
let cachedAnonymousUsername: string | null | undefined;

/**
 * Chat list item returned by user-chat API.
 */
export type UserChatSummary = {
    id: string;
    createdAt: string;
    updatedAt: string;
    lastMessageAt: string | null;
    messagesCount: number;
    title: string;
    preview: string;
};

/**
 * Active durable job linked to the currently open chat.
 */
export type UserChatJob = {
    id: string;
    createdAt: string;
    updatedAt: string;
    chatId: string;
    userId: number;
    agentPermanentId: string;
    userMessageId: string;
    assistantMessageId: string;
    clientMessageId: string;
    status: 'QUEUED' | 'RUNNING';
    parameters: Record<string, unknown>;
    queuedAt: string;
    startedAt: string | null;
    completedAt: string | null;
    cancelRequestedAt: string | null;
    lastHeartbeatAt: string | null;
    leaseExpiresAt: string | null;
    attemptCount: number;
    provider: string | null;
    failureReason: string | null;
};

/**
 * API payload for list endpoint.
 */
export type UserChatsSnapshot = {
    chats: Array<UserChatSummary>;
    activeChatId: string | null;
    activeMessages: Array<ChatMessage>;
    activeDraftMessage?: string | null;
    activeJobs: Array<UserChatJob>;
};

/**
 * API payload for single chat detail endpoint.
 */
export type UserChatDetail = {
    chat: UserChatSummary;
    messages: Array<ChatMessage>;
    draftMessage?: string | null;
    activeJobs: Array<UserChatJob>;
};

/**
 * API payload returned after enqueueing one durable turn.
 */
export type UserChatEnqueueResult = UserChatDetail & {
    job: UserChatJob;
};

/**
 * Returns true when value matches anonymous username format.
 */
function isAnonymousUsername(value: unknown): value is string {
    return typeof value === 'string' && ANONYMOUS_USERNAME_PATTERN.test(value);
}

/**
 * Generates a random base58 suffix with deterministic length.
 */
function generateBase58Suffix(length: number): string {
    const randomValues = new Uint32Array(length);

    if (typeof globalThis.crypto?.getRandomValues === 'function') {
        globalThis.crypto.getRandomValues(randomValues);
    } else {
        for (let index = 0; index < randomValues.length; index++) {
            randomValues[index] = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
        }
    }

    return Array.from(randomValues, (value) => BASE58_ALPHABET[value % BASE58_ALPHABET.length]).join('');
}

/**
 * Creates one stable client-generated deduplication key for durable message sends.
 */
export function createUserChatClientMessageId(): string {
    return generateBase58Suffix(18);
}

/**
 * Creates one new anonymous username aligned with server-side format.
 */
function generateAnonymousUsername(): string {
    return `${ANONYMOUS_USERNAME_PREFIX}${generateBase58Suffix(ANONYMOUS_USERNAME_SUFFIX_LENGTH)}`;
}

/**
 * Resolves stable anonymous username and stores it in browser localStorage.
 */
function getOrCreateAnonymousUsername(): string | null {
    if (typeof window === 'undefined') {
        return null;
    }

    if (cachedAnonymousUsername !== undefined) {
        return cachedAnonymousUsername;
    }

    try {
        const storedAnonymousUsername = window.localStorage.getItem(ANONYMOUS_USERNAME_STORAGE_KEY);
        if (isAnonymousUsername(storedAnonymousUsername)) {
            cachedAnonymousUsername = storedAnonymousUsername;
            return cachedAnonymousUsername;
        }
    } catch {
        // Ignore storage errors and fall back to in-memory generation.
    }

    const generatedAnonymousUsername = generateAnonymousUsername();
    cachedAnonymousUsername = generatedAnonymousUsername;

    try {
        window.localStorage.setItem(ANONYMOUS_USERNAME_STORAGE_KEY, generatedAnonymousUsername);
    } catch {
        // Ignore storage errors - in-memory value is still stable for current tab.
    }

    return cachedAnonymousUsername;
}

/**
 * Creates request headers for user-chat API calls with stable anonymous identity.
 */
function createUserChatRequestHeaders(initialHeaders?: HeadersInit): Headers {
    const headers = new Headers(initialHeaders);
    const anonymousUsername = getOrCreateAnonymousUsername();

    if (anonymousUsername) {
        headers.set(ANONYMOUS_USERNAME_HEADER_NAME, anonymousUsername);
    }

    return headers;
}

/**
 * Normalizes unknown API payload to one structured error payload object.
 */
function normalizeUserChatApiErrorPayload(payload: unknown): UserChatApiErrorPayload {
    if (!payload || typeof payload !== 'object') {
        return {};
    }

    return payload as UserChatApiErrorPayload;
}

/**
 * Resolves best-effort user-facing error message from API payload.
 */
function resolveUserChatApiErrorMessage(payload: UserChatApiErrorPayload, fallbackMessage: string): string {
    if (typeof payload.error === 'string' && payload.error.trim().length > 0) {
        return payload.error;
    }

    return fallbackMessage;
}

/**
 * Resolves best-effort machine-readable API error code.
 */
function resolveUserChatApiErrorCode(payload: UserChatApiErrorPayload): string | null {
    if (typeof payload.code === 'string' && payload.code.trim().length > 0) {
        return payload.code;
    }

    return null;
}

/**
 * Resolves friendly error from failed user-chat API response.
 */
async function resolveUserChatApiError(response: Response, fallbackMessage: string): Promise<UserChatApiError> {
    const rawPayload = await response.json().catch(() => ({}));
    const payload = normalizeUserChatApiErrorPayload(rawPayload);

    return new UserChatApiError(resolveUserChatApiErrorMessage(payload, fallbackMessage), {
        status: response.status,
        code: resolveUserChatApiErrorCode(payload),
        details: payload.details,
        url: response.url,
    });
}

/**
 * Fetches chats for one agent and includes resolved active chat messages.
 */
export async function fetchUserChats(agentName: string, chatId?: string): Promise<UserChatsSnapshot> {
    const query = new URLSearchParams();
    if (chatId) {
        query.set('chat', chatId);
    }

    const queryString = query.toString();
    const response = await fetch(
        `/agents/${encodeURIComponent(agentName)}/api/user-chats${queryString ? `?${queryString}` : ''}`,
        {
            method: 'GET',
            cache: 'no-store',
            headers: createUserChatRequestHeaders(),
        },
    );

    if (!response.ok) {
        throw await resolveUserChatApiError(response, 'Failed to load chats.');
    }

    return (await response.json()) as UserChatsSnapshot;
}

/**
 * Creates a new empty chat for one agent.
 */
export async function createUserChat(agentName: string): Promise<UserChatDetail> {
    const response = await fetch(`/agents/${encodeURIComponent(agentName)}/api/user-chats`, {
        method: 'POST',
        headers: createUserChatRequestHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({}),
    });

    if (!response.ok) {
        throw await resolveUserChatApiError(response, 'Failed to create chat.');
    }

    return (await response.json()) as UserChatDetail;
}

/**
 * Loads a single chat detail by id.
 */
export async function fetchUserChat(agentName: string, chatId: string): Promise<UserChatDetail> {
    const response = await fetch(`/agents/${encodeURIComponent(agentName)}/api/user-chats/${encodeURIComponent(chatId)}`, {
        method: 'GET',
        cache: 'no-store',
        headers: createUserChatRequestHeaders(),
    });

    if (!response.ok) {
        throw await resolveUserChatApiError(response, 'Failed to load chat.');
    }

    return (await response.json()) as UserChatDetail;
}

/**
 * Enqueues one user-authored message for durable server-side processing.
 */
export async function sendUserChatMessage(
    agentName: string,
    chatId: string,
    payload: {
        clientMessageId: string;
        message: string;
        attachments?: ChatMessage['attachments'];
        parameters?: Record<string, unknown>;
    },
): Promise<UserChatEnqueueResult> {
    const response = await fetch(
        `/agents/${encodeURIComponent(agentName)}/api/user-chats/${encodeURIComponent(chatId)}/messages`,
        {
            method: 'POST',
            headers: createUserChatRequestHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload),
        },
    );

    if (!response.ok) {
        throw await resolveUserChatApiError(response, 'Failed to send chat message.');
    }

    return (await response.json()) as UserChatEnqueueResult;
}

/**
 * Requests cancellation for one active durable chat job.
 */
export async function cancelUserChatJob(agentName: string, chatId: string, jobId: string): Promise<UserChatDetail> {
    const response = await fetch(
        `/agents/${encodeURIComponent(agentName)}/api/user-chats/${encodeURIComponent(chatId)}/jobs/${encodeURIComponent(jobId)}/cancel`,
        {
            method: 'POST',
            headers: createUserChatRequestHeaders(),
        },
    );

    if (!response.ok) {
        throw await resolveUserChatApiError(response, 'Failed to cancel chat job.');
    }

    return (await response.json()) as UserChatDetail;
}

/**
 * Replaces stored messages for one chat.
 */
export async function saveUserChatMessages(
    agentName: string,
    chatId: string,
    messages: ReadonlyArray<ChatMessage>,
    options: UserChatSaveRequestOptions = {},
): Promise<UserChatDetail> {
    const response = await fetch(`/agents/${encodeURIComponent(agentName)}/api/user-chats/${encodeURIComponent(chatId)}`, {
        method: 'PATCH',
        headers: createUserChatRequestHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ messages }),
        keepalive: options.keepalive,
    });

    if (!response.ok) {
        throw await resolveUserChatApiError(response, 'Failed to save chat.');
    }

    return (await response.json()) as UserChatDetail;
}

/**
 * Saves the draft message for one chat without modifying messages.
 */
export async function saveUserChatDraft(
    agentName: string,
    chatId: string,
    draftMessage: string | null,
    options: UserChatSaveRequestOptions = {},
): Promise<void> {
    const response = await fetch(`/agents/${encodeURIComponent(agentName)}/api/user-chats/${encodeURIComponent(chatId)}/draft`, {
        method: 'PATCH',
        headers: createUserChatRequestHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ draftMessage }),
        keepalive: options.keepalive,
    });

    if (!response.ok) {
        throw await resolveUserChatApiError(response, 'Failed to save chat draft.');
    }
}

/**
 * Deletes one chat by id.
 */
export async function removeUserChat(agentName: string, chatId: string): Promise<void> {
    const response = await fetch(`/agents/${encodeURIComponent(agentName)}/api/user-chats/${encodeURIComponent(chatId)}`, {
        method: 'DELETE',
        headers: createUserChatRequestHeaders(),
    });

    if (!response.ok) {
        throw await resolveUserChatApiError(response, 'Failed to delete chat.');
    }
}
