'use client';

import { Clock3Icon, XIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Dialog } from '../../../../components/Portal/Dialog';
import type { UserChatTimeout } from '../../../../utils/userChatClient';
import { formatChatTimeoutRemainingTime } from './formatChatTimeoutRemainingTime';

/**
 * Fallback label shown when a timeout does not carry a custom wake-up message.
 */
const DEFAULT_TIMEOUT_LABEL = 'Scheduled timeout';

/**
 * Props accepted by the compact timeout action shown in the chat action bar.
 */
type ChatTimeoutButtonProps = {
    activeTimeouts: ReadonlyArray<UserChatTimeout>;
    currentTimestamp: number;
    onCancelActiveTimeout?: (timeoutId: string) => Promise<void> | void;
};

/**
 * Orders active timeouts by the nearest due time so the most urgent timer drives the compact badge.
 */
function sortChatTimeoutsByDueAt(
    leftTimeout: UserChatTimeout,
    rightTimeout: UserChatTimeout,
): number {
    const leftDueAtTimestamp = new Date(leftTimeout.dueAt).getTime();
    const rightDueAtTimestamp = new Date(rightTimeout.dueAt).getTime();

    if (!Number.isFinite(leftDueAtTimestamp) || !Number.isFinite(rightDueAtTimestamp)) {
        return leftTimeout.createdAt.localeCompare(rightTimeout.createdAt);
    }

    return leftDueAtTimestamp - rightDueAtTimestamp;
}

/**
 * Renders a compact timeout badge in the chat action bar and a modal list of active chat timers.
 */
export function ChatTimeoutButton(props: ChatTimeoutButtonProps) {
    const { activeTimeouts, currentTimestamp, onCancelActiveTimeout } = props;
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const sortedTimeouts = useMemo(() => [...activeTimeouts].sort(sortChatTimeoutsByDueAt), [activeTimeouts]);
    const primaryTimeout = sortedTimeouts[0] || null;

    useEffect(() => {
        if (activeTimeouts.length === 0) {
            setIsDialogOpen(false);
        }
    }, [activeTimeouts.length]);

    if (!primaryTimeout) {
        return null;
    }

    const primaryTimeoutLabel = formatChatTimeoutRemainingTime(primaryTimeout.dueAt, currentTimestamp);
    const activeTimeoutsLabel = activeTimeouts.length === 1 ? '1 active timeout' : `${activeTimeouts.length} active timeouts`;

    return (
        <>
            <button
                type="button"
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-amber-200/80 bg-white/90 px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-sm transition hover:border-amber-300 hover:bg-white hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
                onClick={() => setIsDialogOpen(true)}
                aria-label={`${activeTimeoutsLabel}. Nearest timeout ${primaryTimeoutLabel}.`}
                title={`${activeTimeoutsLabel}. Nearest timeout ${primaryTimeoutLabel}.`}
            >
                <Clock3Icon className="h-4 w-4 text-amber-600" />
                <span>{primaryTimeoutLabel}</span>
            </button>

            {isDialogOpen && (
                <Dialog onClose={() => setIsDialogOpen(false)} className="w-full max-w-lg p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Active timeouts</h2>
                            <p className="mt-1 text-sm text-slate-500">
                                {activeTimeouts.length === 1
                                    ? 'This chat has one active timeout.'
                                    : `This chat has ${activeTimeouts.length} active timeouts.`}
                            </p>
                        </div>
                        <button
                            type="button"
                            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            onClick={() => setIsDialogOpen(false)}
                            aria-label="Close active timeouts"
                        >
                            <XIcon className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="mt-5 space-y-3">
                        {sortedTimeouts.map((timeout) => (
                            <article
                                key={timeout.timeoutId}
                                className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-semibold text-slate-900">
                                        {timeout.message || DEFAULT_TIMEOUT_LABEL}
                                    </div>
                                    <div className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                                        <Clock3Icon className="h-3.5 w-3.5" />
                                        <span>{formatChatTimeoutRemainingTime(timeout.dueAt, currentTimestamp)}</span>
                                    </div>
                                    {timeout.cancelRequestedAt && (
                                        <div className="mt-1 text-[11px] text-slate-500">Cancellation requested</div>
                                    )}
                                </div>
                                {onCancelActiveTimeout && (
                                    <button
                                        type="button"
                                        className="rounded-full border border-slate-300/80 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-default disabled:opacity-50"
                                        onClick={() => {
                                            void onCancelActiveTimeout(timeout.timeoutId);
                                        }}
                                        disabled={Boolean(timeout.cancelRequestedAt)}
                                    >
                                        {timeout.cancelRequestedAt ? 'Cancelling' : 'Cancel'}
                                    </button>
                                )}
                            </article>
                        ))}
                    </div>
                </Dialog>
            )}
        </>
    );
}
