'use client';

import type { FitAddon } from '@xterm/addon-fit';
import type { IDisposable, Terminal } from '@xterm/xterm';
import type { MutableRefObject } from 'react';
import { useEffect, useRef } from 'react';

/**
 * Shared xterm color palette for embedded admin terminals.
 */
const ADMIN_XTERM_THEME = {
    background: '#020617',
    foreground: '#e2e8f0',
    cursor: '#38bdf8',
    cursorAccent: '#020617',
    selectionBackground: '#334155',
    black: '#0f172a',
    red: '#f87171',
    green: '#34d399',
    yellow: '#fbbf24',
    blue: '#60a5fa',
    magenta: '#c084fc',
    cyan: '#22d3ee',
    white: '#e5e7eb',
    brightBlack: '#64748b',
    brightRed: '#fb7185',
    brightGreen: '#4ade80',
    brightYellow: '#fde047',
    brightBlue: '#93c5fd',
    brightMagenta: '#d8b4fe',
    brightCyan: '#67e8f9',
    brightWhite: '#ffffff',
};

/**
 * Disposable callback shape used by browser event listeners.
 */
type AdminXtermDisposable = IDisposable;

/**
 * Props accepted by the shared xterm renderer.
 */
type AdminXtermTerminalProps = {
    /**
     * Stable logical terminal identifier. Changing it resets the xterm screen.
     */
    readonly terminalId: string;

    /**
     * Full buffered output for the current terminal session or read-only log.
     */
    readonly output: string;

    /**
     * Placeholder shown inside the terminal before output arrives.
     */
    readonly emptyState: string;

    /**
     * Whether the attached process is currently running.
     */
    readonly isRunning?: boolean;

    /**
     * Whether keyboard input should be blocked.
     */
    readonly isReadOnly?: boolean;

    /**
     * Whether plain LF characters should be rendered as terminal line endings.
     */
    readonly isPlainTextOutput?: boolean;

    /**
     * Terminal height class.
     */
    readonly heightClassName?: string;

    /**
     * Accessible label for the terminal container.
     */
    readonly ariaLabel: string;

    /**
     * Sends user input bytes back to the server-side terminal session.
     */
    readonly onData?: (data: string) => void;
};

/**
 * Shared xterm.js terminal renderer used by interactive admin shells and read-only log views.
 */
export function AdminXtermTerminal({
    terminalId,
    output,
    emptyState,
    isRunning = false,
    isReadOnly = false,
    isPlainTextOutput = false,
    heightClassName = 'h-[28rem]',
    ariaLabel,
    onData,
}: AdminXtermTerminalProps) {
    const containerReference = useRef<HTMLDivElement | null>(null);
    const terminalReference = useRef<Terminal | null>(null);
    const fitAddonReference = useRef<FitAddon | null>(null);
    const writtenOutputReference = useRef('');
    const terminalIdReference = useRef(terminalId);
    const currentTerminalIdReference = useRef(terminalId);
    const outputReference = useRef(output);
    const emptyStateReference = useRef(emptyState);
    const isReadOnlyReference = useRef(isReadOnly);
    const isRunningReference = useRef(isRunning);
    const onDataReference = useRef(onData);
    const isPlainTextOutputReference = useRef(isPlainTextOutput);

    currentTerminalIdReference.current = terminalId;
    outputReference.current = output;
    emptyStateReference.current = emptyState;

    useEffect(() => {
        isReadOnlyReference.current = isReadOnly;
        isRunningReference.current = isRunning;
        onDataReference.current = onData;
        isPlainTextOutputReference.current = isPlainTextOutput;

        const terminal = terminalReference.current;
        if (!terminal) {
            return;
        }

        terminal.options.disableStdin = isReadOnly || !isRunning || !onData;
        terminal.options.cursorBlink = !isReadOnly && isRunning;
    }, [isPlainTextOutput, isReadOnly, isRunning, onData]);

    useEffect(() => {
        let isDisposed = false;
        const disposables: AdminXtermDisposable[] = [];

        /**
         * Initializes xterm and its addons after the browser container is mounted.
         */
        async function initializeTerminal(): Promise<void> {
            const container = containerReference.current;
            if (!container) {
                return;
            }

            const [{ Terminal: XtermTerminal }, { FitAddon: XtermFitAddon }] = await Promise.all([
                import('@xterm/xterm'),
                import('@xterm/addon-fit'),
            ]);

            if (isDisposed) {
                return;
            }

            const terminal = new XtermTerminal({
                allowProposedApi: false,
                cursorBlink: !isReadOnlyReference.current && isRunningReference.current,
                disableStdin: isReadOnlyReference.current || !isRunningReference.current || !onDataReference.current,
                fontFamily: '"Cascadia Mono", "Fira Code", Consolas, "Liberation Mono", Menlo, monospace',
                fontSize: 13,
                lineHeight: 1.28,
                scrollback: 10_000,
                tabStopWidth: 8,
                theme: ADMIN_XTERM_THEME,
            });
            const fitAddon = new XtermFitAddon();

            terminal.loadAddon(fitAddon);
            terminal.open(container);
            terminalReference.current = terminal;
            fitAddonReference.current = fitAddon;

            disposables.push(
                terminal.onData((data) => {
                    if (isReadOnlyReference.current || !isRunningReference.current) {
                        return;
                    }

                    onDataReference.current?.(data);
                }),
                terminal.onBinary((data) => {
                    if (isReadOnlyReference.current || !isRunningReference.current) {
                        return;
                    }

                    onDataReference.current?.(data);
                }),
            );

            const fitTerminal = () => {
                try {
                    fitAddon.fit();
                } catch (error) {
                    console.warn('[admin-terminal] Failed to fit xterm terminal:', error);
                }
            };

            window.requestAnimationFrame(fitTerminal);

            if (typeof ResizeObserver !== 'undefined') {
                const resizeObserver = new ResizeObserver(() => {
                    window.requestAnimationFrame(fitTerminal);
                });
                resizeObserver.observe(container);
                disposables.push({ dispose: () => resizeObserver.disconnect() });
            } else {
                window.addEventListener('resize', fitTerminal);
                disposables.push({ dispose: () => window.removeEventListener('resize', fitTerminal) });
            }

            synchronizeTerminalOutput({
                terminal,
                terminalId: currentTerminalIdReference.current,
                output: outputReference.current,
                emptyState: emptyStateReference.current,
                writtenOutputReference,
                terminalIdReference,
                isPlainTextOutput: isPlainTextOutputReference.current,
            });
        }

        void initializeTerminal();

        return () => {
            isDisposed = true;
            disposables.forEach((disposable) => disposable.dispose());
            terminalReference.current?.dispose();
            terminalReference.current = null;
            fitAddonReference.current = null;
            writtenOutputReference.current = '';
        };
    }, []);

    useEffect(() => {
        const terminal = terminalReference.current;
        if (!terminal) {
            return;
        }

        synchronizeTerminalOutput({
            terminal,
            terminalId,
            output,
            emptyState,
            writtenOutputReference,
            terminalIdReference,
            isPlainTextOutput,
        });
    }, [emptyState, isPlainTextOutput, output, terminalId]);

    return (
        <div
            className={`overflow-hidden rounded-lg border border-slate-800 bg-slate-950 shadow-sm ${heightClassName}`}
            aria-label={ariaLabel}
            role="region"
            onClick={() => terminalReference.current?.focus()}
        >
            <div ref={containerReference} className="h-full p-3" />
        </div>
    );
}

/**
 * Inputs used while synchronizing React's full output buffer into xterm's incremental writer.
 */
type SynchronizeTerminalOutputOptions = {
    readonly terminal: Terminal;
    readonly terminalId: string;
    readonly output: string;
    readonly emptyState: string;
    readonly writtenOutputReference: MutableRefObject<string>;
    readonly terminalIdReference: MutableRefObject<string>;
    readonly isPlainTextOutput: boolean;
};

/**
 * Writes only the appended output chunk when possible, resetting xterm when the buffer changed wholesale.
 */
function synchronizeTerminalOutput({
    terminal,
    terminalId,
    output,
    emptyState,
    writtenOutputReference,
    terminalIdReference,
    isPlainTextOutput,
}: SynchronizeTerminalOutputOptions): void {
    const displayOutput = createTerminalDisplayOutput({
        output,
        emptyState,
        isPlainTextOutput,
    });
    const previousDisplayOutput = writtenOutputReference.current;
    const isSameTerminal = terminalIdReference.current === terminalId;
    const isAppendOutputPossible = isSameTerminal && displayOutput.startsWith(previousDisplayOutput);

    if (!isAppendOutputPossible) {
        terminal.reset();
        terminal.write(displayOutput);
    } else if (displayOutput.length > previousDisplayOutput.length) {
        terminal.write(displayOutput.slice(previousDisplayOutput.length));
    }

    terminalIdReference.current = terminalId;
    writtenOutputReference.current = displayOutput;
}

/**
 * Converts buffered output into a stream suitable for xterm.
 */
function createTerminalDisplayOutput({
    output,
    emptyState,
    isPlainTextOutput,
}: {
    readonly output: string;
    readonly emptyState: string;
    readonly isPlainTextOutput: boolean;
}): string {
    const rawOutput = output || `\x1b[2m${emptyState}\x1b[0m\r\n`;

    if (!isPlainTextOutput) {
        return rawOutput;
    }

    return rawOutput.replace(/\r?\n/gu, '\r\n');
}
