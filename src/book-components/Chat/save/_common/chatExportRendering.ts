import type { ChatParticipant } from '../../types/ChatParticipant';

/**
 * Fallback accent colors used when a participant does not define a custom color.
 *
 * @private internal utility of chat save format definitions
 */
const ROLE_COLOR_FALLBACKS: Record<string, string> = {
    USER: '#0ea5e9',
    ASSISTANT: '#2563eb',
    SYSTEM: '#64748b',
};

/**
 * Minimal participant visuals needed by chat exports.
 *
 * @private internal utility of chat save format definitions
 */
export type ChatExportParticipantVisuals = {
    readonly displayName: string;
    readonly accentColor: string;
};

/**
 * Formats exported timestamps into a compact human-readable label.
 *
 * @private internal utility of chat save format definitions
 */
export function formatChatExportTimestamp(value?: string | Date): string {
    if (!value) {
        return '';
    }

    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
}

/**
 * Builds a participant lookup indexed by both raw and upper-cased names.
 *
 * @private internal utility of chat save format definitions
 */
export function buildChatExportParticipantMap(
    participants: ReadonlyArray<ChatParticipant>,
): ReadonlyMap<string, ChatParticipant> {
    const participantMap = new Map<string, ChatParticipant>();

    for (const participant of participants) {
        const participantName = String(participant.name);
        participantMap.set(participantName, participant);
        participantMap.set(participantName.toUpperCase(), participant);
    }

    return participantMap;
}

/**
 * Resolves the display label and accent color for one message sender.
 *
 * @private internal utility of chat save format definitions
 */
export function resolveChatExportParticipantVisuals(
    participants: ReadonlyMap<string, ChatParticipant>,
    sender: string,
): ChatExportParticipantVisuals {
    const normalizedSender = String(sender || 'SYSTEM');
    const participant = participants.get(normalizedSender) ?? participants.get(normalizedSender.toUpperCase());
    const upperSender = normalizedSender.toUpperCase();

    return {
        displayName: participant?.fullname?.trim() || normalizedSender,
        accentColor: normalizeParticipantColor(participant?.color) ?? ROLE_COLOR_FALLBACKS[upperSender] ?? '#64748b',
    };
}

/**
 * Normalizes participant colors so exported output can rely on a CSS-friendly string value.
 *
 * @private internal utility of chat save format definitions
 */
function normalizeParticipantColor(color: ChatParticipant['color']): string | undefined {
    if (!color) {
        return undefined;
    }

    if (typeof color === 'string') {
        return color;
    }

    const colorHelper = color as { toString?: () => string };
    if (typeof colorHelper.toString === 'function') {
        return colorHelper.toString();
    }

    return undefined;
}

// Note: [💞] Ignore a discrepancy between file name and entity name
