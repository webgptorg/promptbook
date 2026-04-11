import type { UserChatTimeout } from '@/src/utils/userChatClient';
import Link from 'next/link';
import type { useAgentTimeoutsClientState } from './useAgentTimeoutsClientState';

/**
 * Props for one timeout-manager table row.
 *
 * @private function of AgentTimeoutsClient
 */
type AgentTimeoutsTableRowProps = {
    agentName: string;
    state: ReturnType<typeof useAgentTimeoutsClientState>;
    timeout: UserChatTimeout;
};

/**
 * Resolved badge presentation for one timeout status.
 *
 * @private function of AgentTimeoutsTableRow
 */
type TimeoutStatusPresentation = {
    className: string;
    label: string;
};

/**
 * Determines whether a queued timeout is currently paused.
 *
 * @private function of AgentTimeoutsTableRow
 */
function isTimeoutPaused(timeout: UserChatTimeout): boolean {
    return timeout.status === 'QUEUED' && Boolean(timeout.pausedAt);
}

/**
 * Determines whether a timeout still supports direct edits.
 *
 * @private function of AgentTimeoutsTableRow
 */
function isTimeoutEditable(timeout: UserChatTimeout): boolean {
    return timeout.status === 'QUEUED';
}

/**
 * Determines whether a timeout can still be cancelled.
 *
 * @private function of AgentTimeoutsTableRow
 */
function isTimeoutCancelable(timeout: UserChatTimeout): boolean {
    return timeout.status === 'QUEUED' || timeout.status === 'RUNNING';
}

/**
 * Resolves the badge label and colors for one timeout status.
 *
 * @private function of AgentTimeoutsTableRow
 */
function resolveTimeoutStatusPresentation(timeout: UserChatTimeout): TimeoutStatusPresentation {
    if (timeout.status === 'RUNNING') {
        return { label: timeout.status, className: 'border-blue-200 bg-blue-50 text-blue-700' };
    }

    if (timeout.status === 'FAILED') {
        return { label: timeout.status, className: 'border-rose-200 bg-rose-50 text-rose-700' };
    }

    if (timeout.status === 'COMPLETED') {
        return { label: timeout.status, className: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
    }

    if (timeout.status === 'CANCELLED') {
        return { label: timeout.status, className: 'border-gray-200 bg-gray-100 text-gray-700' };
    }

    if (isTimeoutPaused(timeout)) {
        return { label: 'PAUSED', className: 'border-orange-200 bg-orange-50 text-orange-700' };
    }

    return { label: timeout.status, className: 'border-slate-200 bg-slate-50 text-slate-700' };
}

/**
 * Formats the pause or resume button label for the current busy state.
 *
 * @private function of AgentTimeoutsTableRow
 */
function resolvePauseButtonLabel(
    isBusy: boolean,
    busyAction: ReturnType<typeof useAgentTimeoutsClientState>['busyAction'],
    isPaused: boolean,
): string {
    const pauseAction = isPaused ? 'resume' : 'pause';

    if (isBusy && busyAction === pauseAction) {
        return isPaused ? 'Resuming...' : 'Pausing...';
    }

    return isPaused ? 'Resume' : 'Pause';
}

/**
 * Formats milliseconds into compact human-friendly duration text.
 *
 * @private function of AgentTimeoutsTableRow
 */
function formatDuration(milliseconds: number): string {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
    const days = Math.floor(totalSeconds / 86_400);
    const hours = Math.floor((totalSeconds % 86_400) / 3_600);
    const minutes = Math.floor((totalSeconds % 3_600) / 60);
    const seconds = totalSeconds % 60;
    const parts: Array<string> = [];

    if (days > 0) {
        parts.push(`${days}d`);
    }
    if (hours > 0) {
        parts.push(`${hours}h`);
    }
    if (minutes > 0) {
        parts.push(`${minutes}m`);
    }
    if (parts.length === 0) {
        parts.push(`${seconds}s`);
    }

    return parts.slice(0, 2).join(' ');
}

/**
 * Truncates long text to keep table rows compact.
 *
 * @private function of AgentTimeoutsTableRow
 */
function truncateText(value: string, maxLength: number): string {
    return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

/**
 * Renders one timeout row with its derived actions and status badge.
 *
 * @private function of AgentTimeoutsClient
 */
export function AgentTimeoutsTableRow({ agentName, state, timeout }: AgentTimeoutsTableRowProps) {
    const isBusy = state.busyTimeoutId === timeout.timeoutId;
    const isPaused = isTimeoutPaused(timeout);
    const isEditable = isTimeoutEditable(timeout);
    const isCancelable = isTimeoutCancelable(timeout);
    const statusPresentation = resolveTimeoutStatusPresentation(timeout);

    return (
        <tr>
            <td className="px-4 py-3 align-top">
                <div className="font-mono text-[11px] font-semibold text-gray-900">{timeout.timeoutId}</div>
                <div className="mt-1 text-[11px] text-gray-500">Updated {new Date(timeout.updatedAt).toLocaleString()}</div>
            </td>
            <td className="px-4 py-3 align-top">
                <Link
                    href={`/agents/${encodeURIComponent(agentName)}/chat?chat=${encodeURIComponent(timeout.chatId)}`}
                    className="break-all text-blue-700 hover:underline"
                >
                    {timeout.chatId}
                </Link>
            </td>
            <td className="px-4 py-3 align-top">
                <span className={`rounded-full border px-2 py-0.5 font-semibold ${statusPresentation.className}`}>
                    {statusPresentation.label}
                </span>
            </td>
            <td className="px-4 py-3 align-top">{new Date(timeout.dueAt).toLocaleString()}</td>
            <td className="px-4 py-3 align-top">
                {timeout.recurrenceIntervalMs ? `Every ${formatDuration(timeout.recurrenceIntervalMs)}` : 'One-shot'}
            </td>
            <td className="max-w-xs px-4 py-3 align-top">
                <div className="truncate text-[11px] text-gray-700">{timeout.message || 'No message'}</div>
                <div className="mt-1 font-mono text-[10px] text-gray-500">
                    {truncateText(JSON.stringify(timeout.parameters || {}), 120)}
                </div>
            </td>
            <td className="px-4 py-3 align-top">
                <div className="flex justify-end gap-2">
                    {isEditable ? (
                        <>
                            <button
                                type="button"
                                onClick={() => {
                                    void state.toggleTimeoutPause(timeout);
                                }}
                                disabled={isBusy}
                                className="rounded-md border border-gray-300 px-2 py-1 font-semibold text-gray-700 disabled:opacity-60"
                            >
                                {resolvePauseButtonLabel(isBusy, state.busyAction, isPaused)}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    void state.extendTimeout(timeout);
                                }}
                                disabled={isBusy}
                                className="rounded-md border border-gray-300 px-2 py-1 font-semibold text-gray-700 disabled:opacity-60"
                            >
                                {isBusy && state.busyAction === 'extend' ? 'Extending...' : 'Extend'}
                            </button>
                            <button
                                type="button"
                                onClick={() => state.openEditDialog(timeout)}
                                disabled={isBusy}
                                className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 font-semibold text-blue-700 disabled:opacity-60"
                            >
                                Edit
                            </button>
                        </>
                    ) : null}
                    {isCancelable ? (
                        <button
                            type="button"
                            onClick={() => {
                                void state.cancelTimeout(timeout);
                            }}
                            disabled={isBusy}
                            className="rounded-md border border-red-200 bg-red-50 px-2 py-1 font-semibold text-red-700 disabled:opacity-60"
                        >
                            {isBusy && state.busyAction === 'cancel' ? 'Cancelling...' : 'Cancel'}
                        </button>
                    ) : null}
                    {!isEditable && !isCancelable ? (
                        <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 font-medium text-gray-500">
                            -
                        </span>
                    ) : null}
                </div>
            </td>
        </tr>
    );
}
