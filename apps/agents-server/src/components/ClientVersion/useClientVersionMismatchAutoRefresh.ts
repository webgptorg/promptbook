import { useCallback, useEffect, useRef, useState } from 'react';
import { ClientVersionMismatchInfo } from '../../utils/clientVersionClient';

/**
 * Delay before the page reloads automatically after a mismatch is detected.
 */
const AUTO_REFRESH_DELAY_MS = 7000;

/**
 * Interval used by the visible-tab countdown.
 */
const COUNTDOWN_INTERVAL_MS = 1000;

/**
 * Auto-refresh state consumed by the private mismatch dialog.
 *
 * @private internal type of <ClientVersionMismatchListener/>
 */
type UseClientVersionMismatchAutoRefreshResult = {
    /**
     * Milliseconds left before the automatic refresh completes.
     */
    readonly remainingAutoRefreshMs: number;
    /**
     * Indicates whether the focus-gated countdown is currently running.
     */
    readonly countdownActive: boolean;
    /**
     * Indicates whether the user paused the automatic refresh.
     */
    readonly autoRefreshStopped: boolean;
    /**
     * Refreshes the page immediately.
     */
    readonly handleManualRefresh: () => void;
    /**
     * Stops the active countdown and keeps the overlay visible.
     */
    readonly handleStopCountdown: () => void;
};

/**
 * Handles the countdown lifecycle that nudges the user to refresh after a server update.
 *
 * @param mismatchInfo - Current mismatch details, or `null` when no mismatch is active.
 * @returns Dialog state and controls for the client-version refresh flow.
 *
 * @private function of <ClientVersionMismatchListener/>
 */
export function useClientVersionMismatchAutoRefresh(
    mismatchInfo: ClientVersionMismatchInfo | null,
): UseClientVersionMismatchAutoRefreshResult {
    const [remainingAutoRefreshMs, setRemainingAutoRefreshMs] = useState(AUTO_REFRESH_DELAY_MS);
    const [countdownActive, setCountdownActive] = useState(false);
    const [autoRefreshStopped, setAutoRefreshStopped] = useState(false);
    const countdownIntervalRef = useRef<number | null>(null);

    const stopCountdown = useCallback(() => {
        if (countdownIntervalRef.current !== null) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }

        setCountdownActive(false);
    }, []);

    const startCountdown = useCallback(() => {
        if (typeof window === 'undefined' || autoRefreshStopped || countdownIntervalRef.current !== null) {
            return;
        }

        setCountdownActive(true);
        countdownIntervalRef.current = window.setInterval(() => {
            setRemainingAutoRefreshMs((previousRemainingAutoRefreshMs) => {
                const nextRemainingAutoRefreshMs = Math.max(
                    0,
                    previousRemainingAutoRefreshMs - COUNTDOWN_INTERVAL_MS,
                );

                if (nextRemainingAutoRefreshMs === 0) {
                    stopCountdown();
                    window.location.reload();
                }

                return nextRemainingAutoRefreshMs;
            });
        }, COUNTDOWN_INTERVAL_MS);
    }, [autoRefreshStopped, stopCountdown]);

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
        return () => {
            stopCountdown();
        };
    }, [stopCountdown]);

    useEffect(() => {
        if (!mismatchInfo) {
            stopCountdown();
            return;
        }

        stopCountdown();
        setAutoRefreshStopped(false);
        setRemainingAutoRefreshMs(AUTO_REFRESH_DELAY_MS);
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
            startCountdown();
        };
        const handleBlur = () => {
            stopCountdown();
        };

        // Only count down while the user is actively looking at the outdated tab.
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
    }, [autoRefreshStopped, mismatchInfo, startCountdown, stopCountdown]);

    return {
        remainingAutoRefreshMs,
        countdownActive,
        autoRefreshStopped,
        handleManualRefresh,
        handleStopCountdown,
    };
}
