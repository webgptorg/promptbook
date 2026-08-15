import { spaceTrim } from 'spacetrim';
import { formatTimeoutDurationHuman } from '../../../../../src/book-components/Chat/utils/timeoutToolCallPresentation';

/**
 * Builds the synthetic user-like message injected when a timeout elapses.
 *
 * A repeating planned message stays armed after every firing, so its wake-up says so: the agent
 * only has to act on the message itself, not to plan the same wake-up again.
 *
 * @private internal utility of userChatTimeout
 */
export function createTimeoutWakeUpMessage(options: {
    readonly timeoutId: string;
    readonly durationMs: number;
    readonly intervalMs?: number | null;
    readonly message?: string | null;
}): string {
    const message = options.message?.trim() || '';
    const headline = options.intervalMs
        ? `⏱️ Planned message elapsed, repeating every ${formatTimeoutDurationHuman(options.intervalMs)}.`
        : `⏱️ Timeout elapsed after ${options.durationMs}ms.`;

    return spaceTrim(
        (block) => `
            ${headline}
            timeoutId: ${options.timeoutId}
            ${message ? block(message) : ''}
        `,
    );
}
