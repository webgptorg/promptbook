/**
 * Quotes one PostgreSQL identifier safely.
 *
 * @param identifier - Raw SQL identifier.
 * @returns Quoted identifier.
 *
 * @private internal utility of `scheduleDefaultFederatedAgentsSync`
 */
export function quoteIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
}
