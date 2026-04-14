import { ClientVersionMismatchError } from '@promptbook-local/utils';
import { useEffect, useRef } from 'react';
import { reportClientVersionMismatch } from '../../utils/clientVersionClient';
import { inspectClientVersionMismatch } from './inspectClientVersionMismatch';

/**
 * Installed fetch wrapper that keeps the original browser fetch available for cleanup.
 *
 * @private internal type of <ClientVersionMismatchListener/>
 */
type ClientVersionMismatchFetchInterceptor = {
    /**
     * Original fetch implementation present before the mismatch listener patched it.
     */
    readonly originalFetch: typeof window.fetch;
    /**
     * Wrapped fetch implementation that reports client-version mismatches.
     */
    readonly patchedFetch: typeof window.fetch;
};

/**
 * Installs the fetch wrapper that turns server/client version mismatches into the shared UI event.
 *
 * @private function of <ClientVersionMismatchListener/>
 */
export function useClientVersionMismatchFetchInterceptor(): void {
    const fetchInterceptorRef = useRef<ClientVersionMismatchFetchInterceptor | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.fetch !== 'function' || fetchInterceptorRef.current) {
            return undefined;
        }

        const originalFetch = window.fetch.bind(window);
        const patchedFetch = createClientVersionMismatchPatchedFetch(originalFetch);
        const installedFetchInterceptor = {
            originalFetch,
            patchedFetch,
        };

        fetchInterceptorRef.current = installedFetchInterceptor;
        window.fetch = patchedFetch;

        // Keep both global fetch references aligned so every caller sees the same mismatch handling.
        if (globalThis.fetch !== patchedFetch) {
            globalThis.fetch = patchedFetch;
        }

        return () => {
            restoreClientVersionMismatchFetch(installedFetchInterceptor);
            if (fetchInterceptorRef.current === installedFetchInterceptor) {
                fetchInterceptorRef.current = null;
            }
        };
    }, []);
}

/**
 * Creates the wrapped fetch implementation that reports version mismatches before rethrowing them.
 */
function createClientVersionMismatchPatchedFetch(originalFetch: typeof window.fetch): typeof window.fetch {
    return async (input, init) => {
        const response = await originalFetch(input, init);
        const mismatchInfo = await inspectClientVersionMismatch(response);

        if (!mismatchInfo) {
            return response;
        }

        reportClientVersionMismatch(mismatchInfo);
        throw new ClientVersionMismatchError(
            mismatchInfo.requiredVersion,
            mismatchInfo.reportedVersion,
            mismatchInfo.message,
        );
    };
}

/**
 * Restores the original fetch implementation when the listener unmounts.
 */
function restoreClientVersionMismatchFetch(
    installedFetchInterceptor: ClientVersionMismatchFetchInterceptor | null,
): void {
    if (!installedFetchInterceptor) {
        return;
    }

    window.fetch = installedFetchInterceptor.originalFetch;
    if (globalThis.fetch === installedFetchInterceptor.patchedFetch) {
        globalThis.fetch = installedFetchInterceptor.originalFetch;
    }
}
