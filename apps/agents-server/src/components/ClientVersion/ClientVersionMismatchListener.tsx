'use client';

import { CLIENT_LATEST_VERSION, CLIENT_VERSION_HEADER, ClientVersionMismatchError } from '@promptbook-local/utils';
import { useCallback, useEffect, useRef, useState } from 'react';
import spaceTrim from 'spacetrim';
import {
    ClientVersionMismatchInfo,
    onClientVersionMismatch,
    reportClientVersionMismatch,
} from '../../utils/clientVersionClient';

const AUTO_REFRESH_DELAY_MS = 7000;
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
    const [remainingAutoRefreshMs, setRemainingAutoRefreshMs] = useState(AUTO_REFRESH_DELAY_MS);
    const [countdownActive, setCountdownActive] = useState(false);
    const [autoRefreshStopped, setAutoRefreshStopped] = useState(false);
    const fetchInterceptorRef = useRef<{
        originalFetch: typeof window.fetch;
        patchedFetch: typeof window.fetch;
    } | null>(null);
    const countdownIntervalRef = useRef<ReturnType<typeof window.setInterval> | null>(null);
    const remainingAutoRefreshMsRef = useRef(AUTO_REFRESH_DELAY_MS);
    const autoRefreshStoppedRef = useRef(false);

    const stopCountdown = useCallback(() => {
        if (countdownIntervalRef.current !== null) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }
        setCountdownActive(false);
    }, []);

    const startCountdown = useCallback(() => {
        if (typeof window === 'undefined' || autoRefreshStoppedRef.current || countdownIntervalRef.current !== null) {
            return;
        }

        setCountdownActive(true);
        countdownIntervalRef.current = window.setInterval(() => {
            setRemainingAutoRefreshMs((prev) => {
                const next = Math.max(0, prev - COUNTDOWN_INTERVAL_MS);
                remainingAutoRefreshMsRef.current = next;

                if (next === 0) {
                    stopCountdown();
                    window.location.reload();
                }

                return next;
            });
        }, COUNTDOWN_INTERVAL_MS);
    }, [stopCountdown]);

    const handleManualRefresh = useCallback(() => {
        if (typeof window !== 'undefined') {
            window.location.reload();
        }
    }, []);

    const handleStopCountdown = useCallback(() => {
        stopCountdown();
        setAutoRefreshStopped(true);
    }, [stopCountdown]);

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
        autoRefreshStoppedRef.current = autoRefreshStopped;
        if (autoRefreshStopped) {
            stopCountdown();
        }
    }, [autoRefreshStopped, stopCountdown]);

    useEffect(() => {
        if (!mismatchInfo) {
            stopCountdown();
            return;
        }

        setAutoRefreshStopped(false);
        autoRefreshStoppedRef.current = false;
        setCountdownActive(false);
        setRemainingAutoRefreshMs(AUTO_REFRESH_DELAY_MS);
        remainingAutoRefreshMsRef.current = AUTO_REFRESH_DELAY_MS;
    }, [mismatchInfo, stopCountdown]);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return undefined;
        }
        if (!mismatchInfo || autoRefreshStopped) {
            stopCountdown();
            return undefined;
        }

        const handleFocus = () => {
            if (autoRefreshStoppedRef.current) {
                return;
            }
            startCountdown();
        };

        const handleBlur = () => {
            stopCountdown();
        };

        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);

        if (document.hasFocus()) {
            handleFocus();
        }

        return () => {
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('blur', handleBlur);
            stopCountdown();
        };
    }, [mismatchInfo, autoRefreshStopped, startCountdown, stopCountdown]);

    if (!mismatchInfo) {
        return null;
    }

    const message = mismatchInfo.message || FALLBACK_MESSAGE;
    const countdownSeconds = Math.max(0, Math.ceil(remainingAutoRefreshMs / 1000));
    const countdownStatus = autoRefreshStopped
        ? 'Automatic refresh paused. Refresh manually when you are ready for the new version.'
        : countdownActive
        ? `Auto-refreshing in ${countdownSeconds}s…`
        : 'Focus this tab to start the 7-second refresh countdown.';

    const stopButtonClassName = [
        'inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        autoRefreshStopped
            ? 'border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
            : 'border-slate-900/10 text-slate-700 hover:border-slate-300',
    ].join(' ');
    const refreshButtonClassName =
        'inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';

    return (
        <div
            role="status"
            aria-live="assertive"
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 p-4"
        >
            <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Update ready</p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-900">New version available</h2>
                <p className="mt-4 text-sm text-slate-600 whitespace-pre-line">{message}</p>
                <p className="mt-5 text-sm font-medium text-slate-700">{countdownStatus}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                    <button type="button" className={refreshButtonClassName} onClick={handleManualRefresh}>
                        Refresh now
                    </button>
                    <button
                        type="button"
                        className={stopButtonClassName}
                        onClick={handleStopCountdown}
                        disabled={autoRefreshStopped}
                    >
                        Stop countdown
                    </button>
                </div>
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
