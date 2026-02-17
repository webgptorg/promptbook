'use client';

import { CLIENT_LATEST_VERSION, CLIENT_VERSION_HEADER, ClientVersionMismatchError } from '@promptbook-local/utils';
import { useEffect, useRef, useState } from 'react';
import spaceTrim from 'spacetrim';
import {
    ClientVersionMismatchInfo,
    onClientVersionMismatch,
    reportClientVersionMismatch,
} from '../../utils/clientVersionClient';

const DEFAULT_REFRESH_DELAY_MS = 5000;
const COUNTDOWN_INTERVAL_MS = 1000;
const REQUIRED_VERSION_HEADER = 'x-promptbook-required-version';
const FALLBACK_MESSAGE =
    'Promptbook has been updated on the server. We will refresh the page automatically so you get the latest experience.';

/**
 * Client overlay that watches for version mismatches, displays a friendly notice, and refreshes the page.
 *
 * @private Agents Server presentation helper.
 */
export function ClientVersionMismatchListener() {
    const [mismatchInfo, setMismatchInfo] = useState<ClientVersionMismatchInfo | null>(null);
    const [countdown, setCountdown] = useState<number>(Math.ceil(DEFAULT_REFRESH_DELAY_MS / 1000));
    const fetchInterceptorRef = useRef<{
        originalFetch: typeof window.fetch;
        patchedFetch: typeof window.fetch;
    } | null>(null);

    useEffect(() => {
        const cleanup = onClientVersionMismatch((info) => {
            setMismatchInfo(info);
        });
        return cleanup;
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.fetch !== 'function') {
            return undefined;
        }
        if (fetchInterceptorRef.current) {
            return undefined;
        }

        const originalFetch = window.fetch.bind(window);

        const patchedFetch: typeof window.fetch = async (input, init) => {
            const response = await originalFetch(input, init);
            const info = await inspectClientVersionMismatch(response);
            if (info) {
                reportClientVersionMismatch(info);
                throw new ClientVersionMismatchError(info.requiredVersion, info.reportedVersion, info.message);
            }
            return response;
        };

        fetchInterceptorRef.current = {
            originalFetch,
            patchedFetch,
        };

        window.fetch = patchedFetch;
        if (globalThis.fetch !== patchedFetch) {
            globalThis.fetch = patchedFetch;
        }

        return () => {
            if (!fetchInterceptorRef.current) {
                return;
            }

            window.fetch = fetchInterceptorRef.current.originalFetch;
            if (globalThis.fetch === fetchInterceptorRef.current.patchedFetch) {
                globalThis.fetch = fetchInterceptorRef.current.originalFetch;
            }
            fetchInterceptorRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!mismatchInfo) {
            return undefined;
        }

        setCountdown(Math.ceil(DEFAULT_REFRESH_DELAY_MS / COUNTDOWN_INTERVAL_MS));
        let remaining = DEFAULT_REFRESH_DELAY_MS;

        const tick = () => {
            remaining -= COUNTDOWN_INTERVAL_MS;
            setCountdown(Math.max(0, Math.ceil(remaining / COUNTDOWN_INTERVAL_MS)));
        };

        const interval = setInterval(tick, COUNTDOWN_INTERVAL_MS);
        const timeout = setTimeout(() => {
            window.location.reload();
        }, DEFAULT_REFRESH_DELAY_MS);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [mismatchInfo]);

    if (!mismatchInfo) {
        return null;
    }

    const message = mismatchInfo.message || FALLBACK_MESSAGE;
    const reportedVersion = mismatchInfo.reportedVersion ?? 'unknown';
    const requiredVersion = mismatchInfo.requiredVersion;

    return (
        <div
            role="status"
            aria-live="assertive"
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 p-4"
        >
            <div className="w-full max-w-2xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Action required</p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-900">Update ready</h2>
                <p className="mt-4 text-sm text-slate-600 whitespace-pre-line">{message}</p>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>Current version: v{reportedVersion}</span>
                    <span>Required version: v{requiredVersion}</span>
                </div>
                <p className="mt-4 text-sm font-medium text-slate-700">Refreshing in {countdown}s…</p>
            </div>
        </div>
    );
}

async function inspectClientVersionMismatch(response: Response): Promise<ClientVersionMismatchInfo | null> {
    const requiredVersionFromHeader = response.headers.get(REQUIRED_VERSION_HEADER);
    if (requiredVersionFromHeader) {
        const reportedVersion = normalizeClientVersion(response.headers);
        const bodyText = await response.text();
        const trimmed = spaceTrim(bodyText);
        return {
            requiredVersion: requiredVersionFromHeader,
            reportedVersion,
            message: trimmed || FALLBACK_MESSAGE,
        };
    }

    if (response.status === 426) {
        const reportedVersion = normalizeClientVersion(response.headers);
        let requiredVersion = response.headers.get(REQUIRED_VERSION_HEADER) ?? CLIENT_LATEST_VERSION;
        let message = FALLBACK_MESSAGE;

        try {
            const payload = (await response.clone().json()) as { error?: Record<string, unknown> } | null;
            if (payload?.error) {
                const errorDetails = payload.error;
                if (typeof errorDetails.requiredVersion === 'string') {
                    requiredVersion = errorDetails.requiredVersion;
                }
                if (typeof errorDetails.message === 'string') {
                    message = spaceTrim(errorDetails.message);
                }
            }
        } catch {
            // Ignore JSON parsing issues and keep fallback message.
        }

        return {
            requiredVersion,
            reportedVersion,
            message: message || FALLBACK_MESSAGE,
        };
    }

    return null;
}

function normalizeClientVersion(headers: Headers): string | null {
    const value = headers.get(CLIENT_VERSION_HEADER);
    return value ? value.trim() : null;
}
