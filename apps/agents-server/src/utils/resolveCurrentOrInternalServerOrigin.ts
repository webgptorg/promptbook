import { $provideServer } from '../tools/$provideServer';
import { resolveInternalServerOrigin } from './resolveInternalServerOrigin';

/**
 * Resolves the current request-scoped server origin when available and falls back to the
 * deployment-level internal origin for detached background execution.
 *
 * @returns Normalized same-instance server origin without a trailing slash.
 *
 * @private Internal helper for Agents Server worker self-calls and background agent resolution.
 */
export async function resolveCurrentOrInternalServerOrigin(): Promise<string> {
    try {
        const { publicUrl } = await $provideServer();
        return publicUrl.href.replace(/\/+$/g, '');
    } catch (error) {
        if (isMissingRequestScopeError(error)) {
            return resolveInternalServerOrigin();
        }

        throw error;
    }
}

/**
 * Detects Next.js request-scope errors thrown when headers-based routing helpers run outside a request.
 *
 * @param error - Unknown failure thrown while resolving request-scoped server context.
 * @returns `true` when no request scope is active and internal-origin fallback should be used.
 *
 * @private Internal helper for Agents Server worker self-calls and background agent resolution.
 */
function isMissingRequestScopeError(error: unknown): boolean {
    if (!(error instanceof Error)) {
        return false;
    }

    const normalizedMessage = error.message.toLowerCase();
    return normalizedMessage.includes('outside a request scope') || normalizedMessage.includes('outside a request');
}
