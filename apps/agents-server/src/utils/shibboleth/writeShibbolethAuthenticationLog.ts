import {
    createShibbolethAuthenticationLogPayload,
    type CreateShibbolethAuthenticationLogPayloadOptions,
    type ReadonlyHeadersLike,
} from './createShibbolethAuthenticationLogPayload';

/**
 * Writes one sanitized Shibboleth diagnostic event to the application logs when
 * the current request carries Shibboleth-related headers.
 *
 * @param headers - Request headers or another read-only header accessor.
 * @param options - Event metadata describing where the diagnostic event originated.
 *
 * @private Internal helper of the Agents Server authentication diagnostics.
 */
export function writeShibbolethAuthenticationLog(
    headers: ReadonlyHeadersLike,
    options: CreateShibbolethAuthenticationLogPayloadOptions,
): void {
    const payload = createShibbolethAuthenticationLogPayload(headers, options);

    if (!payload) {
        return;
    }

    console.info(`[auth][shibboleth] ${JSON.stringify(payload)}`);
}
