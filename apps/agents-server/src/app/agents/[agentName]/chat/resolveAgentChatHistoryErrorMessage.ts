/**
 * Resolves one unknown error to a user-facing chat-history message.
 *
 * @private function of useAgentChatHistoryClientState
 */
export function resolveAgentChatHistoryErrorMessage(error: unknown, fallbackMessage: string): string {
    return error instanceof Error ? error.message : fallbackMessage;
}
