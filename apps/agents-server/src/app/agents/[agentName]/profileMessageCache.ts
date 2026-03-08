/**
 * Utility for temporarily persisting profile-chat payload until the standalone
 * chat view loads so the same message can be replayed there.
 */
import type { ChatMessage } from '@promptbook-local/types';

const STORAGE_KEY_PREFIX = 'agents-server:agent-profile-message';

type PendingProfileMessagePayload = {
    message?: string;
    attachments?: ChatMessage['attachments'];
};

/**
 * Builds the storage key for the given agent scope.
 */
function buildStorageKey(agentName: string): string {
    return `${STORAGE_KEY_PREFIX}:${encodeURIComponent(agentName)}`;
}

/**
 * Returns true when pending message has non-whitespace content.
 */
function hasMessageContent(message: string | undefined): message is string {
    return typeof message === 'string' && message.trim() !== '';
}

/**
 * Stores pending profile-chat payload in sessionStorage or clears the entry
 * when no transferable content is supplied.
 *
 * @private Internal helper used by Agents Server profile routes.
 */
export function setPendingProfileMessage(
    agentName: string,
    payload: PendingProfileMessagePayload,
): void {
    if (typeof window === 'undefined' || !window.sessionStorage) {
        return;
    }

    const storageKey = buildStorageKey(agentName);
    const normalizedPayload: PendingProfileMessagePayload = {};
    if (hasMessageContent(payload.message)) {
        normalizedPayload.message = payload.message;
    }
    if (payload.attachments && payload.attachments.length > 0) {
        normalizedPayload.attachments = payload.attachments;
    }

    if (normalizedPayload.message || normalizedPayload.attachments) {
        window.sessionStorage.setItem(storageKey, JSON.stringify(normalizedPayload));
        return;
    }

    window.sessionStorage.removeItem(storageKey);
}

/**
 * Reads and removes the pending profile-chat payload for the given agent,
 * returning transferable message data once.
 */
export function takePendingProfileMessage(agentName: string): PendingProfileMessagePayload | undefined {
    if (typeof window === 'undefined' || !window.sessionStorage) {
        return undefined;
    }

    const storageKey = buildStorageKey(agentName);
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) {
        return undefined;
    }

    window.sessionStorage.removeItem(storageKey);

    try {
        const payload = JSON.parse(raw) as PendingProfileMessagePayload;
        const resolvedPayload: PendingProfileMessagePayload = {};
        if (hasMessageContent(payload.message)) {
            resolvedPayload.message = payload.message;
        }
        if (Array.isArray(payload.attachments) && payload.attachments.length > 0) {
            resolvedPayload.attachments = payload.attachments;
        }

        if (resolvedPayload.message || resolvedPayload.attachments) {
            return resolvedPayload;
        }
    } catch {
        /* ignore parse errors */
    }

    return undefined;
}
