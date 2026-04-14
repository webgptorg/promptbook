import { ClientVersionMismatchInfo } from '../../utils/clientVersionClient';
import { getClientVersionMismatchMessage } from './getClientVersionMismatchMessage';

/**
 * Props consumed by the private mismatch dialog renderer.
 *
 * @private internal type of <ClientVersionMismatchListener/>
 */
type ClientVersionMismatchDialogProps = {
    /**
     * Details about the currently detected mismatch.
     */
    readonly mismatchInfo: ClientVersionMismatchInfo;
    /**
     * Milliseconds left before the page reloads automatically.
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
     * Refreshes the current page immediately.
     */
    readonly onRefreshNow: () => void;
    /**
     * Stops the automatic refresh countdown.
     */
    readonly onStopCountdown: () => void;
};

/**
 * Resolves the countdown copy shown below the mismatch description.
 */
function getClientVersionMismatchCountdownStatus(
    remainingAutoRefreshMs: number,
    countdownActive: boolean,
    autoRefreshStopped: boolean,
): string {
    if (autoRefreshStopped) {
        return 'Automatic refresh paused. Refresh manually when you are ready for the new version.';
    }

    if (countdownActive) {
        const countdownSeconds = Math.max(0, Math.ceil(remainingAutoRefreshMs / 1000));
        return `Auto-refreshing in ${countdownSeconds}s…`;
    }

    return 'Focus this tab to start the 7-second refresh countdown.';
}

/**
 * Resolves the current styling for the stop-countdown button.
 */
function getClientVersionMismatchStopButtonClassName(autoRefreshStopped: boolean): string {
    return [
        'inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        autoRefreshStopped
            ? 'border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
            : 'border-slate-900/10 text-slate-700 hover:border-slate-300',
    ].join(' ');
}

/**
 * Renders the full-screen client-version mismatch notice and its controls.
 *
 * @param props - Dialog state and handlers prepared by the listener facade.
 *
 * @private function of <ClientVersionMismatchListener/>
 */
export function ClientVersionMismatchDialog(props: ClientVersionMismatchDialogProps) {
    const {
        mismatchInfo,
        remainingAutoRefreshMs,
        countdownActive,
        autoRefreshStopped,
        onRefreshNow,
        onStopCountdown,
    } = props;
    const countdownStatus = getClientVersionMismatchCountdownStatus(
        remainingAutoRefreshMs,
        countdownActive,
        autoRefreshStopped,
    );
    const message = getClientVersionMismatchMessage(mismatchInfo.message);
    const stopButtonClassName = getClientVersionMismatchStopButtonClassName(autoRefreshStopped);
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
                    <button type="button" className={refreshButtonClassName} onClick={onRefreshNow}>
                        Refresh now
                    </button>
                    <button
                        type="button"
                        className={stopButtonClassName}
                        onClick={onStopCountdown}
                        disabled={autoRefreshStopped}
                    >
                        Stop countdown
                    </button>
                </div>
            </div>
        </div>
    );
}
