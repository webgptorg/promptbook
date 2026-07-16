'use client';

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { LiveDemoCommandLine, LiveDemoLine, LiveDemoTextLine, LiveDemoTextTone } from '@/data/liveDemoScript';
import { LIVE_DEMO_SCRIPT, LIVE_DEMO_TYPING_INTERVAL_MS } from '@/data/liveDemoScript';
import { SharedAgentTerminalVisual } from './SharedAgentTerminalVisual';

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
    badgeDone: 'bg-promptbook-green px-1 font-bold text-promptbook-dark-gray',
    key: 'bg-gray-100 px-1 font-bold text-gray-950',
};

/**
 * Command line after partial typing state has been applied.
 */
type VisibleLiveDemoCommandLine = LiveDemoCommandLine & {
    /**
     * Currently typed command prefix.
     */
    readonly typedText: string;
};

/**
 * Line currently visible in the live terminal.
 */
type VisibleLiveDemoLine =
    | LiveDemoTextLine
    | VisibleLiveDemoCommandLine
    | Exclude<LiveDemoLine, LiveDemoTextLine | LiveDemoCommandLine>;

/**
 * Renders one preview of `ptbk coder run` in action - a text terminal that starts
 * at the entered command and settles on the same rich dashboard shape as the real CLI.
 *
 * Note: Specified in [`specs/components/live-terminal.md`](../../../specs/components/live-terminal.md)
 */
export function LiveTerminalDemo() {
    const [visibleLines, setVisibleLines] = useState<ReadonlyArray<VisibleLiveDemoLine>>([]);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let isCancelled = false;

        async function playScript(): Promise<void> {
            for (const line of LIVE_DEMO_SCRIPT) {
                await waitFor(line.delayMs);

                if (isCancelled) {
                    return;
                }

                if (line.kind === 'command') {
                    await typeCommandLine(line, () => isCancelled, setVisibleLines);
                    continue;
                }

                setVisibleLines((previousLines) => [...previousLines, line]);
            }
        }

        playScript();

        return () => {
            isCancelled = true;
        };
    }, []);

    useEffect(() => {
        const scrollContainer = scrollContainerRef.current;

        if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
    }, [visibleLines]);

    return (
        <div className="overflow-hidden rounded-xl border border-gray-700/70 bg-[#0d1117] shadow-2xl shadow-black/40">
            <div className="flex items-center gap-2 border-b border-gray-800 bg-[#161b22] px-4 py-2.5">
                <span className="h-3 w-3 rounded-full bg-[#ff5f57]" aria-hidden />
                <span className="h-3 w-3 rounded-full bg-[#febc2e]" aria-hidden />
                <span className="h-3 w-3 rounded-full bg-[#28c840]" aria-hidden />
                <span className="ml-2 flex-1 truncate font-mono text-xs text-gray-400">
                    ptbk coder run — live terminal
                </span>
                <span className="flex items-center gap-1.5 text-xs text-promptbook-green">
                    <span className="h-2 w-2 rounded-full bg-promptbook-green" aria-hidden />
                    sample run
                </span>
            </div>
            <div
                ref={scrollContainerRef}
                aria-label="Simulated ptbk coder run terminal session"
                className="h-[30rem] overflow-auto p-4 font-mono text-[10px] leading-tight md:h-[38rem] md:text-[11px]"
            >
                {visibleLines.map((line, lineIndex) => (
                    <LiveTerminalLine key={lineIndex} line={line} />
                ))}
            </div>
        </div>
    );
}

/**
 * Renders one visible terminal line.
 */
function LiveTerminalLine({
    line,
}: {
    readonly line: VisibleLiveDemoLine;
}) {
    if (line.kind === 'agentVisual') {
        return <SharedAgentTerminalVisual />;
    }

    if (line.kind === 'command') {
        return (
            <div className="whitespace-pre">
                <span className="select-none text-gray-500">$ </span>
                <span className={LIVE_DEMO_TONE_CLASS_NAMES.command}>{line.typedText}</span>
            </div>
        );
    }

    if (line.parts.length === 0) {
        return <div className="whitespace-pre">&nbsp;</div>;
    }

    return (
        <div className="whitespace-pre">
            {line.parts.map((part, partIndex) => (
                <span key={partIndex} className={LIVE_DEMO_TONE_CLASS_NAMES[part.tone]}>
                    {part.text}
                </span>
            ))}
        </div>
    );
}

/**
 * Types one command line character-by-character.
 */
async function typeCommandLine(
    line: LiveDemoCommandLine,
    isCancelled: () => boolean,
    setVisibleLines: Dispatch<SetStateAction<ReadonlyArray<VisibleLiveDemoLine>>>,
): Promise<void> {
    setVisibleLines((previousLines) => [...previousLines, { ...line, typedText: '' }]);

    for (let typedCharacterCount = 1; typedCharacterCount <= line.text.length; typedCharacterCount++) {
        await waitFor(LIVE_DEMO_TYPING_INTERVAL_MS);

        if (isCancelled()) {
            return;
        }

        setVisibleLines((previousLines) => [
            ...previousLines.slice(0, -1),
            { ...line, typedText: line.text.slice(0, typedCharacterCount) },
        ]);
    }
}

/**
 * Waits for the requested playback delay.
 */
function waitFor(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
