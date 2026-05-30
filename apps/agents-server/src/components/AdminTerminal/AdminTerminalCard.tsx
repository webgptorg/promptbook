'use client';

import { Loader2, Play, Send, SquareTerminal } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { Card } from '../Homepage/Card';
import type { AdminTerminalSession } from './useAdminTerminalSession';

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
     * Controlled terminal input value.
     */
    readonly input: string;

    /**
     * Updates the controlled terminal input.
     */
    readonly onInputChange: (value: string) => void;

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
     * Placeholder used by the terminal input control.
     */
    readonly inputPlaceholder: string;

    /**
     * Optional shortcut buttons that send raw terminal input.
     */
    readonly quickActions?: ReadonlyArray<AdminTerminalQuickAction>;

    /**
     * Optional extra content inserted between the description and the terminal output.
     */
    readonly children?: ReactNode;
};

const INPUT_CLASS_NAME =
    'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50 disabled:text-gray-500';

/**
 * Shared terminal card used by super-admin pages that expose interactive browser terminals.
 */
export function AdminTerminalCard<TSession extends AdminTerminalSession>({
    title,
    description,
    hint,
    session,
    input,
    onInputChange,
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
    inputPlaceholder,
    quickActions = [],
    children,
}: AdminTerminalCardProps<TSession>) {
    const outputReference = useRef<HTMLPreElement | null>(null);

    useEffect(() => {
        if (!outputReference.current) {
            return;
        }

        outputReference.current.scrollTop = outputReference.current.scrollHeight;
    }, [session?.output]);

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
                    <pre
                        ref={outputReference}
                        className="max-h-96 overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-xs text-slate-100"
                    >
                        {session?.output || outputEmptyState}
                    </pre>
                </div>

                <form
                    className="flex flex-col gap-3 md:flex-row"
                    onSubmit={(event) => {
                        event.preventDefault();

                        if (!input.trim()) {
                            return;
                        }

                        const formattedInput = input.endsWith('\n') ? input : `${input}\n`;
                        onSend(formattedInput);
                        onInputChange('');
                    }}
                >
                    <input
                        type="text"
                        value={input}
                        onChange={(event) => onInputChange(event.target.value)}
                        disabled={!session?.isRunning || isSending}
                        placeholder={inputPlaceholder}
                        className={INPUT_CLASS_NAME}
                    />
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="submit"
                            disabled={!session?.isRunning || isSending || input.trim() === ''}
                            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            Send
                        </button>
                        {quickActions.map((quickAction) => (
                            <button
                                key={`${quickAction.label}:${quickAction.input}`}
                                type="button"
                                onClick={() => onSend(quickAction.input)}
                                disabled={!session?.isRunning || isSending}
                                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {quickAction.label}
                            </button>
                        ))}
                    </div>
                </form>
            </div>
        </Card>
    );
}
