'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Avatar, type AvatarDefinition } from '@promptbook-source/avatars';
import { DEFAULT_AGENT_AVATAR_VISUAL_ID } from '@promptbook-source/utils/agents/resolveAgentAvatarImageUrl';
import type {
    LiveTerminalDashboardSnapshot,
    LiveTerminalLine,
    LiveTerminalLineTone,
    LiveTerminalSessionRow,
    LiveTerminalStateTone,
} from '@/data/liveDemoScript';
import {
    LIVE_DEMO_COMMAND,
    LIVE_DEMO_LOOP_PAUSE_MS,
    LIVE_DEMO_TYPING_INTERVAL_MS,
    LIVE_TERMINAL_DASHBOARD_SNAPSHOTS,
    LIVE_TERMINAL_SHELL_PROMPT,
} from '@/data/liveDemoScript';

/**
 * CSS classes used for individual line tones of the live terminal dashboard.
 */
const LIVE_TERMINAL_LINE_TONE_CLASS_NAMES: Record<LiveTerminalLineTone, string> = {
    default: 'text-gray-100',
    muted: 'text-gray-400',
    success: 'text-promptbook-green',
    info: 'text-promptbook-blue',
    warning: 'text-yellow-300',
};

/**
 * CSS classes used for the live terminal state badges.
 */
const LIVE_TERMINAL_STATE_TONE_CLASS_NAMES: Record<LiveTerminalStateTone, string> = {
    loading: 'bg-cyan-300 text-gray-950',
    running: 'bg-promptbook-green text-gray-950',
    verifying: 'bg-fuchsia-300 text-gray-950',
    done: 'bg-promptbook-green text-gray-950',
};

/**
 * Agent avatar identity used by the live terminal preview.
 */
const LIVE_TERMINAL_AGENT_AVATAR_DEFINITION: AvatarDefinition = {
    agentName: 'Promptbook Developer',
    agentHash: 'promptbook-coder-live-terminal',
    colors: ['#7AEBFF', '#7AFFEB', '#30A8BD'],
};

/**
 * Size of the shared avatar visual in the live terminal title bar.
 */
const LIVE_TERMINAL_AVATAR_SIZE = 28;

/**
 * Number of text cells shown in the progress bar.
 */
const LIVE_TERMINAL_PROGRESS_BAR_CELLS = 36;

/**
 * Delay before the command starts typing after each loop reset.
 */
const LIVE_DEMO_INITIAL_DELAY_MS = 450;

/**
 * How long the completed dashboard stays visible before the first scripted replay starts.
 */
const LIVE_DEMO_INITIAL_VISIBLE_MS = 8000;

/**
 * Snapshot shown on first paint so the hero never starts with an empty terminal body.
 */
const LIVE_TERMINAL_INITIAL_SNAPSHOT_INDEX = LIVE_TERMINAL_DASHBOARD_SNAPSHOTS.length - 1;

/**
 * Props accepted by `<LiveTerminalPanel/>`.
 */
type LiveTerminalPanelProps = {
    /**
     * Panel title.
     */
    readonly title: string;

    /**
     * Panel body.
     */
    readonly children: ReactNode;
};

/**
 * Props accepted by `<LiveTerminalStateRow/>`.
 */
type LiveTerminalStateRowProps = {
    /**
     * Active dashboard snapshot.
     */
    readonly snapshot: LiveTerminalDashboardSnapshot;
};

/**
 * Props accepted by `<LiveTerminalSessionRows/>`.
 */
type LiveTerminalSessionRowsProps = {
    /**
     * Rows shown below the `State` row.
     */
    readonly rows: ReadonlyArray<LiveTerminalSessionRow>;
};

/**
 * Props accepted by `<LiveTerminalLines/>`.
 */
type LiveTerminalLinesProps = {
    /**
     * Lines shown inside one terminal panel.
     */
    readonly lines: ReadonlyArray<LiveTerminalLine>;
};

/**
 * Renders one "live" preview of `ptbk coder` in action.
 *
 * The preview types the real `ptbk coder run` command and replays the same dashboard
 * structure that the CLI renders while it processes a prompt. The agent visual uses
 * the shared `src/avatars` renderer, which is also used by Agents Server and by the
 * terminal ASCII bridge in `ptbk coder`.
 *
 * Note: Specified in [`specs/components/live-terminal.md`](../../../specs/components/live-terminal.md)
 */
export function LiveTerminalDemo() {
    const [typedCommandLength, setTypedCommandLength] = useState(LIVE_DEMO_COMMAND.length);
    const [activeSnapshotIndex, setActiveSnapshotIndex] = useState(LIVE_TERMINAL_INITIAL_SNAPSHOT_INDEX);
    const [isDashboardVisible, setIsDashboardVisible] = useState(true);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const activeSnapshot = LIVE_TERMINAL_DASHBOARD_SNAPSHOTS[activeSnapshotIndex] || LIVE_TERMINAL_DASHBOARD_SNAPSHOTS[0]!;
    const typedCommand = LIVE_DEMO_COMMAND.slice(0, typedCommandLength);
    const isCommandTyping = typedCommandLength < LIVE_DEMO_COMMAND.length || !isDashboardVisible;

    useEffect(() => {
        let isCancelled = false;

        function waitFor(milliseconds: number): Promise<void> {
            return new Promise((resolve) => setTimeout(resolve, milliseconds));
        }

        async function playDemo(): Promise<void> {
            await waitFor(LIVE_DEMO_INITIAL_VISIBLE_MS);

            while (!isCancelled) {
                setTypedCommandLength(0);
                setActiveSnapshotIndex(0);
                setIsDashboardVisible(false);

                await waitFor(LIVE_DEMO_INITIAL_DELAY_MS);

                for (
                    let typedCharacterCount = 1;
                    typedCharacterCount <= LIVE_DEMO_COMMAND.length;
                    typedCharacterCount++
                ) {
                    await waitFor(LIVE_DEMO_TYPING_INTERVAL_MS);

                    if (isCancelled) {
                        return;
                    }

                    setTypedCommandLength(typedCharacterCount);
                }

                setIsDashboardVisible(true);

                for (
                    let snapshotIndex = 0;
                    snapshotIndex < LIVE_TERMINAL_DASHBOARD_SNAPSHOTS.length;
                    snapshotIndex++
                ) {
                    const snapshot = LIVE_TERMINAL_DASHBOARD_SNAPSHOTS[snapshotIndex]!;
                    setActiveSnapshotIndex(snapshotIndex);
                    await waitFor(snapshot.durationMs);

                    if (isCancelled) {
                        return;
                    }
                }

                await waitFor(LIVE_DEMO_LOOP_PAUSE_MS);
            }
        }

        void playDemo();

        return () => {
            isCancelled = true;
        };
    }, []);

    useEffect(() => {
        const scrollContainer = scrollContainerRef.current;
        if (!scrollContainer || !isDashboardVisible) {
            return;
        }

        scrollContainer.scrollTop = 0;
    }, [activeSnapshotIndex, isDashboardVisible]);

    return (
        <div className="overflow-hidden rounded-xl border border-gray-700/70 bg-[#0d1117] shadow-2xl shadow-black/40">
            <div className="flex items-center gap-2 border-b border-gray-800 bg-[#161b22] px-4 py-2.5">
                <span className="h-3 w-3 rounded-full bg-[#ff5f57]" aria-hidden />
                <span className="h-3 w-3 rounded-full bg-[#febc2e]" aria-hidden />
                <span className="h-3 w-3 rounded-full bg-[#28c840]" aria-hidden />
                <span className="ml-2 flex-1 truncate font-mono text-xs text-gray-400">
                    ptbk coder run - live dashboard
                </span>
                <Avatar
                    avatarDefinition={LIVE_TERMINAL_AGENT_AVATAR_DEFINITION}
                    visualId={DEFAULT_AGENT_AVATAR_VISUAL_ID}
                    surface="transparent"
                    size={LIVE_TERMINAL_AVATAR_SIZE}
                    title="Promptbook Developer agent visual"
                    className="shrink-0"
                />
                <span className="flex items-center gap-1.5 text-xs text-promptbook-green">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-promptbook-green" aria-hidden />
                    live
                </span>
            </div>

            <div
                ref={scrollContainerRef}
                aria-label="Simulated ptbk coder run dashboard"
                className="h-[31rem] overflow-auto p-4 font-mono text-[11px] leading-relaxed sm:text-xs md:h-[35rem]"
            >
                <div className="min-w-0">
                    <div className="text-gray-500">{LIVE_TERMINAL_SHELL_PROMPT}</div>
                    <div className="whitespace-pre-wrap break-words text-gray-100">
                        <span className="select-none text-gray-500">$ </span>
                        <span>{typedCommand}</span>
                        {isCommandTyping && <LiveTerminalCursor />}
                    </div>

                    {isDashboardVisible && (
                        <div className="mt-4 space-y-3">
                            <LiveTerminalPanel title="Session">
                                <div className="space-y-1.5">
                                    <LiveTerminalStateRow snapshot={activeSnapshot} />
                                    <LiveTerminalSessionRows rows={activeSnapshot.sessionRows} />
                                </div>
                            </LiveTerminalPanel>

                            <LiveTerminalPanel title="Current task">
                                <LiveTerminalLines lines={activeSnapshot.currentTaskLines} />
                            </LiveTerminalPanel>

                            <LiveTerminalPanel title="Live output">
                                <LiveTerminalLines lines={activeSnapshot.liveOutputLines} />
                            </LiveTerminalPanel>

                            <LiveTerminalPanel title="Controls">
                                <div className="flex flex-wrap items-center gap-3 text-gray-200">
                                    <LiveTerminalControlKey>P</LiveTerminalControlKey>
                                    <span>Pause</span>
                                    <LiveTerminalControlKey>CTRL+C</LiveTerminalControlKey>
                                    <span>Exit</span>
                                </div>
                            </LiveTerminalPanel>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * Renders one terminal dashboard panel.
 */
function LiveTerminalPanel({ title, children }: LiveTerminalPanelProps) {
    return (
        <div className="overflow-hidden rounded-md border border-gray-700/80 bg-gray-950/30">
            <div className="border-b border-gray-800 bg-gray-900/70 px-3 py-1.5 text-promptbook-green">{title}</div>
            <div className="px-3 py-2">{children}</div>
        </div>
    );
}

/**
 * Renders the special `State` row with a colored badge.
 */
function LiveTerminalStateRow({ snapshot }: LiveTerminalStateRowProps) {
    return (
        <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
            <span className="text-gray-500">State</span>
            <span className="min-w-0">
                <span
                    className={`mr-2 inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold leading-none ${LIVE_TERMINAL_STATE_TONE_CLASS_NAMES[snapshot.stateTone]}`}
                >
                    {snapshot.stateBadge}
                </span>
                <span className="text-gray-100">{snapshot.stateMessage}</span>
            </span>
        </div>
    );
}

/**
 * Renders labeled rows inside the `Session` panel.
 */
function LiveTerminalSessionRows({ rows }: LiveTerminalSessionRowsProps) {
    return (
        <>
            {rows.map((row) => (
                <div key={row.label} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
                    <span className="text-gray-500">{row.label}</span>
                    {row.progressPercentage === undefined ? (
                        <span className="min-w-0 truncate text-gray-100">{row.text}</span>
                    ) : (
                        <LiveTerminalProgressBar percentage={row.progressPercentage} label={row.text} />
                    )}
                </div>
            ))}
        </>
    );
}

/**
 * Renders one terminal progress bar row.
 */
function LiveTerminalProgressBar({ percentage, label }: { readonly percentage: number; readonly label: string }) {
    const filledCellCount = Math.round((percentage / 100) * LIVE_TERMINAL_PROGRESS_BAR_CELLS);
    const emptyCellCount = Math.max(0, LIVE_TERMINAL_PROGRESS_BAR_CELLS - filledCellCount);

    return (
        <span className="min-w-0 truncate text-gray-100">
            <span className="text-promptbook-green">{'█'.repeat(filledCellCount)}</span>
            <span className="text-promptbook-blue-dark">{'░'.repeat(emptyCellCount)}</span>
            <span className="ml-2">{label}</span>
        </span>
    );
}

/**
 * Renders raw lines inside `Current task` and `Live output` panels.
 */
function LiveTerminalLines({ lines }: LiveTerminalLinesProps) {
    return (
        <div className="space-y-1">
            {lines.map((line, lineIndex) => (
                <div
                    key={`${line.text}-${lineIndex}`}
                    className={`min-h-[1.25em] whitespace-pre-wrap break-words ${
                        LIVE_TERMINAL_LINE_TONE_CLASS_NAMES[line.tone || 'default']
                    }`}
                >
                    {line.text}
                </div>
            ))}
        </div>
    );
}

/**
 * Renders a terminal control key.
 */
function LiveTerminalControlKey({ children }: { readonly children: ReactNode }) {
    return <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-950">{children}</span>;
}

/**
 * Renders the blinking terminal cursor.
 */
function LiveTerminalCursor() {
    return <span className="animate-pulse text-promptbook-blue">▊</span>;
}
