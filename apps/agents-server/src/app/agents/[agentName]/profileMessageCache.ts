/**
 * Utility for temporarily persisting attachments from the profile chat until the
 * standalone chat view loads so the same message can be replayed there.
 */
import type { ChatMessage } from '@promptbook-local/types';

const STORAGE_KEY_PREFIX = 'agents-server:agent-profile-message';

type PendingProfileMessagePayload = {
    readonly attachments?: ChatMessage['attachments'];
};

/**
 * Builds the storage key for the given agent scope.
 */
function buildStorageKey(agentName: string): string {
    return `${STORAGE_KEY_PREFIX}:${encodeURIComponent(agentName)}`;
}

/**
 * Stores the provided attachments in sessionStorage or clears the entry when no
 * attachments are supplied.
 *
 * @private Internal helper used by Agents Server profile routes.
 */
export function setPendingProfileMessageAttachments(
    agentName: string,
    attachments?: ChatMessage['attachments'],
): void {
    if (typeof window === 'undefined' || !window.sessionStorage) {
        return;
    }

    const storageKey = buildStorageKey(agentName);

    if (attachments && attachments.length > 0) {
        const payload: PendingProfileMessagePayload = { attachments };
        window.sessionStorage.setItem(storageKey, JSON.stringify(payload));
        return;
    }

    window.sessionStorage.removeItem(storageKey);
}

/**
 * Reads and removes the pending attachments for the given agent, returning the
 * attachments payload once.
 */
export function takePendingProfileMessageAttachments(
    agentName: string,
): ChatMessage['attachments'] | undefined {
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
        if (payload.attachments && payload.attachments.length > 0) {
            return payload.attachments;
        }
    } catch {
        /* ignore parse errors */
    }

    return undefined;
}
