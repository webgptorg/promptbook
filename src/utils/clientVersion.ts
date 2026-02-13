import spaceTrim from 'spacetrim';
import { PROMPTBOOK_ENGINE_VERSION } from '../version';

/**
 * HTTP header used by Promptbook clients to advertise their release version.
 *
 * @public exported from `@promptbook/utils`
 */
export const CLIENT_VERSION_HEADER = 'x-promptbook-client-version';

/**
 * The latest client (engine) version that the server expects.
 *
 * @public exported from `@promptbook/utils`
 */
export const CLIENT_LATEST_VERSION = PROMPTBOOK_ENGINE_VERSION;

/**
 * Determines if the provided version string exactly matches the latest release.
 *
 * @param version - Version string obtained from a request header.
 * @returns True when the version equals `CLIENT_LATEST_VERSION`.
 *
 * @public exported from `@promptbook/utils`
 */
export function isClientVersionCompatible(version: unknown): version is string {
    return typeof version === 'string' && version === CLIENT_LATEST_VERSION;
}

/**
 * Formats the message that should be shown when a client is out of date.
 *
 * @param clientVersion - The version reported by the client (optional).
 * @returns User-facing text explaining how to fix the mismatch.
 *
 * @public exported from `@promptbook/utils`
 */
export function formatClientVersionMismatchMessage(clientVersion?: string | null): string {
    const reportedVersion = clientVersion ?? 'unknown';
    return spaceTrim(`
        Your Promptbook client (v${reportedVersion}) is out of date.
        This server runs on Vercel and now requires v${CLIENT_LATEST_VERSION}.
        Please update the app or reload the latest release before you continue using chat.
    `);
}

/**
 * Creates a headers object that includes the client version header.
 *
 * @param headers - Optional base headers to clone.
 * @returns New headers object augmented with `CLIENT_VERSION_HEADER`.
 *
 * @public exported from `@promptbook/utils`
 */
export function attachClientVersionHeader<T extends Record<string, string> = Record<string, string>>(
    headers?: T,
): T & Record<typeof CLIENT_VERSION_HEADER, string> {
    return {
        ...(headers ?? {}),
        [CLIENT_VERSION_HEADER]: CLIENT_LATEST_VERSION,
    } as T & Record<typeof CLIENT_VERSION_HEADER, string>;
}

/**
 * Normalizes the client version reported inside a `HeadersInit` object.
 *
 * @param headers - Headers collection to read from.
 * @returns The trimmed client version or `null` when it is missing.
 *
 * @public exported from `@promptbook/utils`
 */
export function getClientVersionFromHeaders(headers?: HeadersInit): string | null {
    if (!headers) {
        return null;
    }
    const normalizedHeaders = new Headers(headers);
    const value = normalizedHeaders.get(CLIENT_VERSION_HEADER);
    return value ? value.trim() : null;
}
