import { spaceTrim } from 'spacetrim';

/**
 * Creates system-message instructions for `USE TIMEOUT`.
 *
 * @private internal utility of USE TIMEOUT
 */
export function createTimeoutSystemMessage(extraInstructions: string): string {
    return spaceTrim(
        (block) => `
            ## Timeout scheduling

            -   Use \`set_timeout\` to wake this same chat thread in the future.
            -   Use \`list_timeouts\` to review timeout ids/details across all chats for the same user+agent scope.
            -   \`cancel_timeout\` accepts either one timeout id or \`allActive: true\` to cancel all active timeouts in this same user+agent scope.
            -   Use \`update_timeout\` to pause/resume, edit next run, edit recurrence, or update timeout payload details.
            -   When one timeout elapses, you will receive a new user-like message that explicitly says it is a timeout wake-up and includes the \`timeoutId\`.
            -   Do not claim a timer was set or cancelled unless the tool confirms it.
            ${block(extraInstructions)}
        `,
    );
}
