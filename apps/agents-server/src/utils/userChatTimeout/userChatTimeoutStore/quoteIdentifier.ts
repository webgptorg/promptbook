/**
 * Quotes one trusted internal table identifier for raw SQL usage.
 *
 * @private function of userChatTimeoutStore
 */
export function quoteIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
}
