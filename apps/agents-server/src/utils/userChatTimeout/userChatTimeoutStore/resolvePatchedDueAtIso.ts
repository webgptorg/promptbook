/**
 * Resolves optional due-date mutations for timeout edits.
 *
 * @private function of userChatTimeoutStore
 */
export function resolvePatchedDueAtIso(options: {
    existingDueAt: string;
    dueAt?: string;
    extendByMs?: number;
}): string | null {
    const hasDueAtPatch = typeof options.dueAt === 'string';
    const hasExtendPatch = typeof options.extendByMs === 'number';

    if (!hasDueAtPatch && !hasExtendPatch) {
        return null;
    }

    if (hasDueAtPatch && hasExtendPatch) {
        throw new Error('Timeout updates must patch either `dueAt` or `extendByMs`, not both.');
    }

    if (hasDueAtPatch) {
        const dueAtTimestamp = Date.parse(options.dueAt!);
        if (!Number.isFinite(dueAtTimestamp)) {
            throw new Error('Timeout `dueAt` must be a valid ISO timestamp.');
        }

        return new Date(dueAtTimestamp).toISOString();
    }

    const extendByMs = options.extendByMs!;
    if (!Number.isFinite(extendByMs) || extendByMs <= 0) {
        throw new Error('Timeout `extendByMs` must be a positive number of milliseconds.');
    }

    const existingDueAtTimestamp = Date.parse(options.existingDueAt);
    if (!Number.isFinite(existingDueAtTimestamp)) {
        throw new Error('Cannot extend timeout with invalid existing due date.');
    }

    return new Date(existingDueAtTimestamp + Math.floor(extendByMs)).toISOString();
}
