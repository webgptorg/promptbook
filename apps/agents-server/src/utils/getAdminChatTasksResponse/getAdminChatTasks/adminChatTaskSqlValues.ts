/**
 * Converts PostgreSQL count-like values into safe JavaScript numbers.
 *
 * @private function of `getAdminChatTasks`
 */
export function resolveSqlCount(value: string | number | undefined): number {
    if (typeof value === 'number') {
        return value;
    }

    if (typeof value === 'string') {
        const parsed = Number.parseInt(value, 10);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
}

/**
 * Converts nullable numeric SQL values into safe JavaScript numbers.
 *
 * @private function of `getAdminChatTasks`
 */
export function resolveNullableSqlNumber(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === 'number') {
        return value;
    }

    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
}
