'use client';

import { Loader2, Play, SquareTerminal } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card } from '../Homepage/Card';
import type { AdminTerminalSession } from './useAdminTerminalSession';
import { AdminXtermTerminal } from './AdminXtermTerminal';

/**
 * One quick terminal action rendered next to the input box.
 */
type AdminTerminalQuickAction = {
    /**
     * Visible button label.
     */
    readonly label: string;

    /**
     * Raw terminal input sent when the button is clicked.
     */
    readonly input: string;
};

/**
 * Props accepted by the shared admin terminal card.
 */
type AdminTerminalCardProps<TSession extends AdminTerminalSession> = {
    /**
     * Title shown above the terminal card.
     */
    readonly title: string;

    /**
     * Short description of what the terminal is for.
     */
    readonly description: string;

    /**
     * Optional extra hint shown below the description.
     */
    readonly hint?: string;

    /**
     * Active or latest terminal session snapshot.
     */
    readonly session: TSession | null;

    /**
     * Starts or reconnects to the terminal session.
     */
    readonly onStart: () => void;

    /**
     * Stops the active terminal session.
     */
    readonly onStop: () => void;

    /**
     * Sends one raw input chunk to the terminal.
     */
    readonly onSend: (input: string) => void;

    /**
     * Whether the surrounding page is still loading the initial terminal state.
     */
    readonly isLoading?: boolean;

    /**
     * Whether a session start request is currently pending.
     */
    readonly isStarting?: boolean;

    /**
     * Whether a terminal input request is currently pending.
     */
    readonly isSending?: boolean;

    /**
     * Whether a session stop request is currently pending.
     */
    readonly isStopping?: boolean;

    /**
     * Label used for the start button while the session is idle.
     */
    readonly startLabel: string;

    /**
     * Label used for the start button while the session is already running.
     */
    readonly runningLabel?: string;

    /**
     * Label used for the stop button.
     */
    readonly stopLabel: string;

    /**
     * Label shown above the terminal output.
     */
    readonly outputLabel: string;

    /**
     * Empty-state text shown before any terminal output exists.
     */
    readonly outputEmptyState: string;

    /**
     * Optional shortcut buttons that send raw terminal input.
     */
    readonly quickActions?: ReadonlyArray<AdminTerminalQuickAction>;

    /**
     * Optional extra content inserted between the description and the terminal output.
     */
    readonly children?: ReactNode;
};

/**
 * Shared terminal card used by super-admin pages that expose interactive browser terminals.
 */
export function AdminTerminalCard<TSession extends AdminTerminalSession>({
    title,
    description,
    hint,
    session,
    onStart,
    onStop,
    onSend,
    isLoading = false,
    isStarting = false,
    isSending = false,
    isStopping = false,
    startLabel,
    runningLabel,
    stopLabel,
    outputLabel,
    outputEmptyState,
    quickActions = [],
    children,
}: AdminTerminalCardProps<TSession>) {
    return (
        <Card className="hover:border-gray-200 hover:shadow-md">
            <div className="space-y-4">
                <div className="space-y-2">
                    <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                    <p className="text-sm text-slate-600">{description}</p>
                    {hint ? <p className="text-sm text-slate-600">{hint}</p> : null}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={onStart}
                        disabled={isLoading || isStarting || session?.isRunning}
                        className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        {session?.isRunning ? runningLabel || startLabel : startLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onStop}
                        disabled={!session?.isRunning || isStopping}
                        className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isStopping ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <SquareTerminal className="h-4 w-4" />
                        )}
                        {stopLabel}
                    </button>
                </div>

                {children}

                <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-slate-700">{outputLabel}</h3>
                        {session ? (
                            <span className="text-xs text-slate-500">
                                {session.isRunning
                                    ? 'Running'
                                    : session.exitCode === 0
                                      ? 'Finished successfully'
                                      : 'Finished with an error'}
                            </span>
                        ) : (
                            <span className="text-xs text-slate-500">No session started yet.</span>
                        )}
                    </div>
                    <AdminXtermTerminal
                        terminalId={session?.id || `${title}:empty`}
                        output={session?.output || ''}
                        emptyState={outputEmptyState}
                        isRunning={Boolean(session?.isRunning)}
                        ariaLabel={outputLabel}
                        onData={onSend}
                    />
                </div>

                {quickActions.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                        {quickActions.map((quickAction) => (
                            <button
                                key={`${quickAction.label}:${quickAction.input}`}
                                type="button"
                                onClick={() => onSend(quickAction.input)}
                                disabled={!session?.isRunning || isSending}
                                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {quickAction.label}
                            </button>
                        ))}
                    </div>
                ) : null}
            </div>
        </Card>
    );
}
