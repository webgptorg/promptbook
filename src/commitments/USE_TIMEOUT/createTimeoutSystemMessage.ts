import { spaceTrim } from 'spacetrim';

/**
 * Creates system-message instructions for `USE TIMEOUT`.
 *
 * @private internal utility of USE TIMEOUT
 */
export function createTimeoutSystemMessage(extraInstructions: string): string {
    return spaceTrim(
        (block) => `
            Timeout scheduling:
            - Use "set_timeout" to wake this same chat thread in the future.
            - Timers are thread-scoped, not global for the whole agent.
            - When one timeout elapses, you will receive a new user-like message that explicitly says it is a timeout wake-up and includes the \`timeoutId\`.
            - Use "cancel_timeout" when a previously scheduled timeout is no longer relevant.
            - Do not claim a timer was set or cancelled unless the tool confirms it.
            ${block(extraInstructions)}
        `,
    );
}
