'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { LiveDemoLine, LiveDemoTextTone } from '@/data/liveDemoScript';
import {
    countLiveDemoScriptRows,
    createLiveDemoScript,
    LIVE_DEMO_COMMAND_PROMPT_PREFIX,
    LIVE_DEMO_MEASURED_CHARACTERS,
    LIVE_DEMO_PLAYBACK_TIMELINE,
    LIVE_DEMO_TYPING_INTERVAL_MS,
} from '@/data/liveDemoScript';
import { SharedAgentTerminalVisual } from './SharedAgentTerminalVisual';
import type { FittedTerminalMetrics } from './useFittedTerminalMetrics';
import { resolveTerminalTextLetterSpacing, useFittedTerminalMetrics } from './useFittedTerminalMetrics';

/**
 * CSS classes used for individual line tones of the live terminal.
 */
const LIVE_DEMO_TONE_CLASS_NAMES: Record<LiveDemoTextTone, string> = {
    plain: 'text-gray-100',
    muted: 'text-gray-400',
    border: 'text-gray-500',
    command: 'text-gray-100',
    prompt: 'text-promptbook-green',
    label: 'text-gray-500',
    sessionTitle: 'font-semibold text-yellow-300',
    taskTitle: 'font-semibold text-fuchsia-300',
    outputTitle: 'font-semibold text-promptbook-green',
    errorTitle: 'font-semibold text-red-300',
    controlsTitle: 'font-semibold text-white',
    success: 'text-promptbook-green',
    error: 'text-red-300',
    info: 'text-promptbook-blue',
    warning: 'text-amber-300',
    progressEmpty: 'text-promptbook-blue',
    // Note: Highlighted runs carry their padding as spaces of the sample itself, so they stay on the character grid
    badgeDone: 'bg-promptbook-green font-bold text-promptbook-dark-gray',
    key: 'bg-gray-100 font-bold text-gray-950',
};

/**
 * Padding around the terminal body, in CSS pixels.
 */
const LIVE_DEMO_TERMINAL_BODY_PADDING_PX = 16;

/**
 * How far the scripted session has been played.
 */
type LiveDemoPlaybackPosition = {
    /**
     * How many scripted lines have already appeared.
     */
    readonly playedLineCount: number;

    /**
     * How many characters have already been typed on the last appeared line.
     */
    readonly typedCharacterCount: number;
};

/**
 * Playback position before the session starts.
 */
const INITIAL_LIVE_DEMO_PLAYBACK_POSITION: LiveDemoPlaybackPosition = {
    playedLineCount: 0,
    typedCharacterCount: 0,
};

/**
 * Renders one preview of `ptbk coder run` in action - a text terminal that starts
 * at the entered command and settles on the same rich dashboard shape as the real CLI.
 *
 * Note: Specified in [`specs/components/live-terminal.md`](../../../specs/components/live-terminal.md)
 */
export function LiveTerminalDemo() {
    const [playbackPosition, setPlaybackPosition] = useState<LiveDemoPlaybackPosition>(
        INITIAL_LIVE_DEMO_PLAYBACK_POSITION,
    );
    const terminalContentRef = useRef<HTMLDivElement>(null);
    const terminalMetrics = useFittedTerminalMetrics(terminalContentRef, LIVE_DEMO_MEASURED_CHARACTERS);
    const terminalColumnCount = terminalMetrics.columnCount;
    const liveDemoScript = useMemo(() => createLiveDemoScript(terminalColumnCount), [terminalColumnCount]);
    const terminalRowCount = useMemo(
        () => countLiveDemoScriptRows(liveDemoScript, terminalColumnCount),
        [liveDemoScript, terminalColumnCount],
    );

    useEffect(() => {
        let isCancelled = false;

        async function playScript(): Promise<void> {
            for (let stepIndex = 0; stepIndex < LIVE_DEMO_PLAYBACK_TIMELINE.length; stepIndex++) {
                const playbackStep = LIVE_DEMO_PLAYBACK_TIMELINE[stepIndex];

                await waitFor(playbackStep.delayMs);

                if (isCancelled) {
                    return;
                }

                setPlaybackPosition({ playedLineCount: stepIndex + 1, typedCharacterCount: 0 });

                for (
                    let typedCharacterCount = 1;
                    typedCharacterCount <= playbackStep.typedCharacterCount;
                    typedCharacterCount++
                ) {
                    await waitFor(LIVE_DEMO_TYPING_INTERVAL_MS);

                    if (isCancelled) {
                        return;
                    }

                    setPlaybackPosition({ playedLineCount: stepIndex + 1, typedCharacterCount });
                }
            }
        }

        playScript();

        return () => {
            isCancelled = true;
        };
    }, []);

    return (
        <div className="overflow-hidden rounded-xl border border-gray-700/70 bg-[#0d1117] shadow-2xl shadow-black/40">
            <div className="flex items-center gap-2 border-b border-gray-800 bg-[#161b22] px-4 py-2.5">
                <span className="h-3 w-3 rounded-full bg-[#ff5f57]" aria-hidden />
                <span className="h-3 w-3 rounded-full bg-[#febc2e]" aria-hidden />
                <span className="h-3 w-3 rounded-full bg-[#28c840]" aria-hidden />
                <span className="ml-2 flex-1 truncate font-mono text-xs text-gray-400">ptbk coder run</span>
                <span className="flex items-center gap-1.5 text-xs text-promptbook-green">
                    <span className="h-2 w-2 rounded-full bg-promptbook-green" aria-hidden />
                    sample run
                </span>
            </div>
            {/* Note: The body is as tall as the whole sample session and as wide as its character grid,
                      so the session never scrolls away from the agent visual and never overflows sideways */}
            <div
                aria-label="Simulated ptbk coder run terminal session"
                className="overflow-y-auto overflow-x-hidden font-mono"
                style={{
                    height:
                        Math.ceil(terminalRowCount * terminalMetrics.lineHeightPx) +
                        2 * LIVE_DEMO_TERMINAL_BODY_PADDING_PX,
                    padding: LIVE_DEMO_TERMINAL_BODY_PADDING_PX,
                    fontSize: terminalMetrics.fontSizePx,
                    lineHeight: `${terminalMetrics.lineHeightPx}px`,
                }}
            >
                <div ref={terminalContentRef}>
                    {/* Note: The character grid is exactly as wide as the frame the sample is drawn for,
                              so output wraps and the agent visual is centered on the very same width */}
                    <div style={{ width: `${terminalColumnCount}ch` }}>
                        {liveDemoScript.slice(0, playbackPosition.playedLineCount).map((line, lineIndex) => (
                            <LiveTerminalLine
                                key={lineIndex}
                                line={line}
                                terminalMetrics={terminalMetrics}
                                typedCharacterCount={
                                    lineIndex === playbackPosition.playedLineCount - 1
                                        ? playbackPosition.typedCharacterCount
                                        : null
                                }
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Renders one visible terminal line.
 */
function LiveTerminalLine({
    line,
    terminalMetrics,
    typedCharacterCount,
}: {
    readonly line: LiveDemoLine;

    /**
     * Measured geometry of the terminal the line is rendered in.
     */
    readonly terminalMetrics: FittedTerminalMetrics;

    /**
     * How many characters of a typed line are already visible, `null` for an already finished line.
     */
    readonly typedCharacterCount: number | null;
}) {
    if (line.kind === 'agentVisual') {
        return <SharedAgentTerminalVisual />;
    }

    if (line.kind === 'command') {
        return (
            // Note: A command longer than the terminal wraps onto the next rows, exactly like in a real terminal
            <div className="whitespace-pre-wrap break-all">
                <span className="select-none text-gray-500">{LIVE_DEMO_COMMAND_PROMPT_PREFIX}</span>
                <span className={LIVE_DEMO_TONE_CLASS_NAMES.command}>
                    {typedCharacterCount === null ? line.text : line.text.slice(0, typedCharacterCount)}
                </span>
            </div>
        );
    }

    if (line.parts.length === 0) {
        return <div className="whitespace-pre">&nbsp;</div>;
    }

    return (
        <div className="whitespace-pre">
            {line.parts.map((part, partIndex) => (
                <span
                    key={partIndex}
                    className={LIVE_DEMO_TONE_CLASS_NAMES[part.tone]}
                    style={{ letterSpacing: resolveTerminalTextLetterSpacing(part.text, terminalMetrics) }}
                >
                    {part.text}
                </span>
            ))}
        </div>
    );
}

/**
 * Waits for the requested playback delay.
 */
function waitFor(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
