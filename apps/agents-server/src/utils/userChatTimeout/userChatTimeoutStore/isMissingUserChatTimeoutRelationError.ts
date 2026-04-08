/**
 * Returns `true` when a timeout-table query failed because the relation does not exist yet.
 *
 * @private function of userChatTimeoutStore
 */
export function isMissingUserChatTimeoutRelationError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
        return false;
    }

    const code = typeof (error as { code?: unknown }).code === 'string' ? (error as { code: string }).code : '';
    const message =
        typeof (error as { message?: unknown }).message === 'string'
            ? (error as { message: string }).message
            : String(error);

    return code === '42P01' || code === 'PGRST205' || /relation .* does not exist/i.test(message);
}
