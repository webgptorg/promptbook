import moment from 'moment';
import type { ChatMessage } from '../types/ChatMessage';

/**
 * Display-ready timestamp values for a chat message.
 *
 * @private utility of `<Chat/>` component
 */
export type ChatMessageTimingDisplay = {
    /**
     * Short, UI-friendly time label (localized).
     */
    readonly timeLabel: string;
    /**
     * Full timestamp label suitable for tooltips or exports.
     */
    readonly fullLabel: string;
    /**
     * Optional duration label for agent message generation.
     */
    readonly durationLabel?: string;
};

/**
 * Builds display-ready timestamp and duration labels for a chat message.
 *
 * @private utility of `<Chat/>` component
 */
export function getChatMessageTimingDisplay(message: ChatMessage): ChatMessageTimingDisplay | null {
    if (!message.createdAt) {
        return null;
    }

    const timestamp = moment(message.createdAt);
    if (!timestamp.isValid()) {
        return null;
    }

    const durationLabel =
        message.generationDurationMs === undefined
            ? undefined
            : formatGenerationDurationLabel(message.generationDurationMs);

    return {
        timeLabel: timestamp.format('LT'),
        fullLabel: timestamp.format('YYYY-MM-DD HH:mm:ss'),
        durationLabel,
    };
}

/**
 * Formats a generation duration value into a compact label.
 */
function formatGenerationDurationLabel(durationMs: number): string {
    if (!Number.isFinite(durationMs) || durationMs < 0) {
        return '0ms';
    }

    const duration = moment.duration(durationMs);
    const totalSeconds = duration.asSeconds();

    if (totalSeconds < 1) {
        return `${Math.max(1, Math.round(duration.asMilliseconds()))}ms`;
    }

    if (totalSeconds < 60) {
        const precision = totalSeconds < 10 ? 1 : 0;
        return `${totalSeconds.toFixed(precision)}s`;
    }

    const minutes = Math.floor(duration.asMinutes());
    const seconds = Math.round(totalSeconds - minutes * 60);
    return `${minutes}m ${seconds}s`;
}
