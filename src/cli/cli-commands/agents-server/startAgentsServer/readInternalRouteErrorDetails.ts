/**
 * Maximum internal route response body length shown in foreground diagnostics.
 *
 * @private internal constant of `startAgentsServer`
 */
const INTERNAL_ROUTE_ERROR_BODY_MAX_LENGTH = 2_000;

/**
 * Reads an internal route error payload so foreground logs show the route-level reason.
 *
 * @private internal utility of `startAgentsServer`
 */
export async function readInternalRouteErrorDetails(response: Response): Promise<string | null> {
    const body = await response.text().catch(() => '');
    const trimmedBody = body.trim();

    if (!trimmedBody) {
        return null;
    }

    const parsedMessage = parseInternalRouteErrorMessage(trimmedBody);
    return truncateInternalRouteErrorDetails(parsedMessage || trimmedBody);
}

/**
 * Extracts a readable error message from an internal route JSON response.
 */
function parseInternalRouteErrorMessage(body: string): string | null {
    try {
        const parsedBody = JSON.parse(body) as {
            error?: unknown;
            message?: unknown;
        };
        const errorMessage = typeof parsedBody.error === 'string' ? parsedBody.error : undefined;
        const fallbackMessage = typeof parsedBody.message === 'string' ? parsedBody.message : undefined;

        return errorMessage || fallbackMessage || null;
    } catch {
        return null;
    }
}

/**
 * Keeps foreground internal-route diagnostics bounded when a route returns a large payload.
 */
function truncateInternalRouteErrorDetails(details: string): string {
    if (details.length <= INTERNAL_ROUTE_ERROR_BODY_MAX_LENGTH) {
        return details;
    }

    return `${details.slice(0, INTERNAL_ROUTE_ERROR_BODY_MAX_LENGTH)}...`;
}
