/**
 * Utility for temporarily persisting profile-chat payload until the standalone
 * chat view loads so the same message can be replayed there.
 */
import type { ChatMessage } from '@promptbook-local/types';

/**
 * Prefix for storage key.
 */
const STORAGE_KEY_PREFIX = 'agents-server:agent-profile-message';

/**
 * Payload for pending profile message.
 */
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
 * Normalizes one pending profile-message payload.
 */
function normalizePendingProfileMessagePayload(
    payload: PendingProfileMessagePayload,
): PendingProfileMessagePayload | undefined {
    const normalizedPayload: PendingProfileMessagePayload = {};

    if (hasMessageContent(payload.message)) {
        normalizedPayload.message = payload.message;
    }
    if (payload.attachments && payload.attachments.length > 0) {
        normalizedPayload.attachments = payload.attachments;
    }

    if (normalizedPayload.message || normalizedPayload.attachments) {
        return normalizedPayload;
    }

    return undefined;
}

/**
 * Reads one normalized pending profile-message payload without mutating storage.
 */
function readPendingProfileMessage(agentName: string): PendingProfileMessagePayload | undefined {
    if (typeof window === 'undefined' || !window.sessionStorage) {
        return undefined;
    }

    const raw = window.sessionStorage.getItem(buildStorageKey(agentName));
    if (!raw) {
        return undefined;
    }

    try {
        return normalizePendingProfileMessagePayload(JSON.parse(raw) as PendingProfileMessagePayload);
    } catch {
        return undefined;
    }
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
    const normalizedPayload = normalizePendingProfileMessagePayload(payload);

    if (normalizedPayload) {
        window.sessionStorage.setItem(storageKey, JSON.stringify(normalizedPayload));
        return;
    }

    window.sessionStorage.removeItem(storageKey);
}

/**
 * Reads the pending profile-chat payload for the given agent without removing it.
 */
export function peekPendingProfileMessage(agentName: string): PendingProfileMessagePayload | undefined {
    return readPendingProfileMessage(agentName);
}

/**
 * Removes the pending profile-chat payload for the given agent.
 */
export function clearPendingProfileMessage(agentName: string): void {
    if (typeof window === 'undefined' || !window.sessionStorage) {
        return;
    }

    window.sessionStorage.removeItem(buildStorageKey(agentName));
}
