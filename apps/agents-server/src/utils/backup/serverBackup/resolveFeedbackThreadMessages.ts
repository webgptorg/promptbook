import { isRecord } from './serverBackupRowUtilities';

/**
 * Parses the persisted feedback chat thread into the same array shape used by chat JSON exports.
 *
 * @param rawChatThread - Raw persisted feedback thread.
 * @returns Parsed chat messages together with an optional raw fallback string.
 *
 * @private function of `createServerBackupZipStream`
 */
export function resolveFeedbackThreadMessages(rawChatThread: unknown): {
    messages: Array<Record<string, unknown>>;
    rawChatThreadText: string | null;
} {
    if (Array.isArray(rawChatThread)) {
        return {
            messages: rawChatThread.filter(isRecord),
            rawChatThreadText: null,
        };
    }

    if (typeof rawChatThread !== 'string') {
        return {
            messages: [],
            rawChatThreadText: null,
        };
    }

    const normalizedChatThreadText = rawChatThread.trim();
    if (normalizedChatThreadText.length === 0) {
        return {
            messages: [],
            rawChatThreadText: null,
        };
    }

    try {
        const parsed = JSON.parse(normalizedChatThreadText);
        if (Array.isArray(parsed)) {
            return {
                messages: parsed.filter(isRecord),
                rawChatThreadText: null,
            };
        }
    } catch {
        // Keep the original text below so the backup still preserves the source thread payload.
    }

    return {
        messages: [],
        rawChatThreadText: normalizedChatThreadText,
    };
}
