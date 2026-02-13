import {
    CLIENT_LATEST_VERSION,
    formatClientVersionMismatchMessage,
    getClientVersionFromHeaders,
    isClientVersionCompatible,
} from '../../../../src/utils/clientVersion';

const TEXT_ENCODER = new TextEncoder();

/**
 * Inspects the incoming request headers and returns the reported client version.
 *
 * @param request - Incoming HTTP request.
 * @returns Parsed version string or `null` when it is missing.
 *
 * @private Internal helper for the Agents Server.
 */
export function getClientVersionFromRequest(request: Request): string | null {
    return getClientVersionFromHeaders(request.headers);
}

/**
 * Builds a streaming response that tells the client to update its version.
 *
 * @param clientVersion - Client version reported in the request.
 * @returns Response that writes the upgrade message and then closes the stream.
 *
 * @private Internal helper for the Agents Server.
 */
export function createVersionMismatchStreamResponse(clientVersion: string | null): Response {
    const message = formatClientVersionMismatchMessage(clientVersion);
    const stream = new ReadableStream({
        start(controller) {
            controller.enqueue(TEXT_ENCODER.encode(`${message}\n`));
            controller.close();
        },
    });

    return new Response(stream, {
        status: 200,
        headers: {
            'Content-Type': 'text/markdown',
            'Access-Control-Allow-Origin': '*',
            'X-Promptbook-Required-Version': CLIENT_LATEST_VERSION,
        },
    });
}

/**
 * Returns a JSON error response that instructs a legacy client to upgrade.
 *
 * @param clientVersion - Client version reported in the request.
 * @returns JSON `Response` with HTTP 426.
 *
 * @private Internal helper for the Agents Server.
 */
export function createVersionMismatchJsonResponse(clientVersion: string | null): Response {
    const message = formatClientVersionMismatchMessage(clientVersion);
    return new Response(
        JSON.stringify({
            error: {
                type: 'client_version_outdated',
                message,
                requiredVersion: CLIENT_LATEST_VERSION,
                clientVersion: clientVersion ?? 'unknown',
            },
        }),
        {
            status: 426,
            headers: {
                'Content-Type': 'application/json',
            },
        },
    );
}

/**
 * Short-circuits further handling when the requesting client is not up to date.
 *
 * @param request - Incoming request.
 * @param responseType - Preferred response format when the version is outdated.
 * @returns A `Response` when the client is outdated, otherwise `null`.
 *
 * @private Internal helper for the Agents Server.
 */
export function respondIfClientVersionIsOutdated(
    request: Request,
    responseType: 'stream' | 'json',
): Response | null {
    const clientVersion = getClientVersionFromRequest(request);
    if (isClientVersionCompatible(clientVersion)) {
        return null;
    }

    if (responseType === 'stream') {
        return createVersionMismatchStreamResponse(clientVersion);
    }

    return createVersionMismatchJsonResponse(clientVersion);
}
