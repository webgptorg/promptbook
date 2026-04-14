import { CLIENT_LATEST_VERSION, CLIENT_VERSION_HEADER } from '@promptbook-local/utils';
import { ClientVersionMismatchInfo } from '../../utils/clientVersionClient';
import { getClientVersionMismatchMessage } from './getClientVersionMismatchMessage';

/**
 * Header carrying the minimum client version accepted by the server.
 */
const REQUIRED_VERSION_HEADER = 'x-promptbook-required-version';

/**
 * JSON body shape returned by the server when it rejects an outdated client.
 *
 * @private internal type of <ClientVersionMismatchListener/>
 */
type ClientVersionMismatchPayload = {
    /**
     * Error details returned by the server.
     */
    readonly error?: {
        /**
         * Version that the server requires from the client.
         */
        readonly requiredVersion?: unknown;
        /**
         * Human-readable explanation of the mismatch.
         */
        readonly message?: unknown;
    };
};

/**
 * Inspects a fetch response and extracts normalized mismatch details when the server requires a newer client.
 *
 * @param response - Fetch response returned by the current page.
 * @returns Normalized mismatch details or `null` when the response does not signal a version mismatch.
 *
 * @private function of <ClientVersionMismatchListener/>
 */
export async function inspectClientVersionMismatch(response: Response): Promise<ClientVersionMismatchInfo | null> {
    const requiredVersionFromHeader = response.headers.get(REQUIRED_VERSION_HEADER);
    if (requiredVersionFromHeader) {
        return {
            requiredVersion: requiredVersionFromHeader,
            reportedVersion: normalizeClientVersion(response.headers),
            message: getClientVersionMismatchMessage(await response.text()),
        };
    }

    if (response.status !== 426) {
        return null;
    }

    return inspectUpgradeRequiredClientVersionMismatch(response);
}

/**
 * Builds mismatch details from a `426 Upgrade Required` response.
 */
async function inspectUpgradeRequiredClientVersionMismatch(response: Response): Promise<ClientVersionMismatchInfo> {
    const reportedVersion = normalizeClientVersion(response.headers);
    let requiredVersion = response.headers.get(REQUIRED_VERSION_HEADER) ?? CLIENT_LATEST_VERSION;
    let message = getClientVersionMismatchMessage(null);
    const payload = await readClientVersionMismatchPayload(response);

    if (typeof payload?.error?.requiredVersion === 'string') {
        requiredVersion = payload.error.requiredVersion;
    }
    if (typeof payload?.error?.message === 'string') {
        message = getClientVersionMismatchMessage(payload.error.message);
    }

    return {
        requiredVersion,
        reportedVersion,
        message,
    };
}

/**
 * Reads the optional JSON payload returned by a mismatch response.
 */
async function readClientVersionMismatchPayload(response: Response): Promise<ClientVersionMismatchPayload | null> {
    try {
        return (await response.clone().json()) as ClientVersionMismatchPayload | null;
    } catch {
        // Some mismatch responses only return plain text, so JSON parsing must stay best-effort.
        return null;
    }
}

/**
 * Reads and trims the client version reported by the response headers.
 */
function normalizeClientVersion(headers: Headers): string | null {
    const value = headers.get(CLIENT_VERSION_HEADER);
    return value ? value.trim() : null;
}
