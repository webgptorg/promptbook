/**
 * Parses a positive numeric user id from an optional query-string value.
 *
 * @param value - Raw user id value.
 * @returns A positive user id, or `null` when the value is missing or invalid.
 *
 * @private shared by admin user-scoped API routes
 */
export function parsePositiveUserId(value: string | null): number | null {
    if (!value) {
        return null;
    }

    if (!/^\d+$/u.test(value)) {
        return null;
    }

    const parsedUserId = Number.parseInt(value, 10);
    return Number.isFinite(parsedUserId) && parsedUserId > 0 ? parsedUserId : null;
}
