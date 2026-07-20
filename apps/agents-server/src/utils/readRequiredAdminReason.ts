/**
 * Reads and validates the required admin reason payload shared by admin task actions.
 *
 * @param request - Incoming admin action request whose JSON body may carry a `reason`.
 * @returns The trimmed non-empty reason, or `null` when it is missing or blank.
 * @private internal admin utility of Agents Server
 */
export async function readRequiredAdminReason(request: Request): Promise<string | null> {
    const payload = (await request.json().catch(() => ({}))) as {
        reason?: unknown;
    };

    if (typeof payload.reason !== 'string') {
        return null;
    }

    const reason = payload.reason.trim();
    return reason.length > 0 ? reason : null;
}
