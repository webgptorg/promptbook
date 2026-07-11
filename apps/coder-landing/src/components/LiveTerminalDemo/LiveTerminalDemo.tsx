'use client';

import { useEffect, useRef, useState } from 'react';
import type { LiveDemoFrame } from '@/data/liveDemoScript';
import { LIVE_DEMO_LOOP_PAUSE_MS, LIVE_DEMO_TYPING_INTERVAL_MS } from '@/data/liveDemoScript';

/**
 * Props accepted by the live terminal dashboard preview.
 */
type LiveTerminalDemoProps = {
    /**
     * Command typed before the dashboard starts redrawing.
     */
    readonly command: string;

    /**
     * Real `ptbk coder run` dashboard snapshots produced by the shared CLI frame builder.
     */
    readonly frames: ReadonlyArray<LiveDemoFrame>;
};

/**
 * Short pause between finishing the typed command and drawing the first dashboard frame.
 */
const LIVE_DEMO_COMMAND_TO_FRAME_DELAY_MS = 450;

/**
 * Renders one "live" preview of `ptbk coder` in action.
 *
 * The command is typed once, then the body replays serialized snapshots produced by the same
 * dashboard renderer that powers the real `ptbk coder run` terminal UI.
 *
 * Note: Specified in [`specs/components/live-terminal.md`](../../../specs/components/live-terminal.md)
 */
export function LiveTerminalDemo({ command, frames }: LiveTerminalDemoProps) {
    const [typedCommand, setTypedCommand] = useState('');
    const [currentFrame, setCurrentFrame] = useState<LiveDemoFrame | null>(frames[0] || null);
    const [isTypingCommand, setIsTypingCommand] = useState(true);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let isCancelled = false;

        function waitFor(milliseconds: number): Promise<void> {
            return new Promise((resolve) => setTimeout(resolve, milliseconds));
        }

        async function playDemo() {
            while (!isCancelled) {
                setCurrentFrame(null);
                setTypedCommand('');
                setIsTypingCommand(true);

                for (let typedCharacterCount = 1; typedCharacterCount <= command.length; typedCharacterCount++) {
                    await waitFor(LIVE_DEMO_TYPING_INTERVAL_MS);
                    if (isCancelled) {
                        return;
                    }
                    setTypedCommand(command.slice(0, typedCharacterCount));
                }

                setIsTypingCommand(false);
                await waitFor(LIVE_DEMO_COMMAND_TO_FRAME_DELAY_MS);

                for (const frame of frames) {
                    if (isCancelled) {
                        return;
                    }
                    setCurrentFrame(frame);
                    await waitFor(frame.delayMs);
                }

                await waitFor(LIVE_DEMO_LOOP_PAUSE_MS);
            }
        }

        playDemo();

        return () => {
            isCancelled = true;
        };
    }, [command, frames]);

    useEffect(() => {
        const scrollContainer = scrollContainerRef.current;
        if (scrollContainer && currentFrame) {
            scrollContainer.scrollTop = 0;
        }
    }, [currentFrame]);

    return (
        <div className="overflow-hidden rounded-xl border border-gray-700/70 bg-[#0d1117] shadow-2xl shadow-black/40">
            <div className="flex items-center gap-2 border-b border-gray-800 bg-[#161b22] px-4 py-2.5">
                <span className="h-3 w-3 rounded-full bg-[#ff5f57]" aria-hidden />
                <span className="h-3 w-3 rounded-full bg-[#febc2e]" aria-hidden />
                <span className="h-3 w-3 rounded-full bg-[#28c840]" aria-hidden />
                <span className="ml-2 flex-1 truncate font-mono text-xs text-gray-400">
                    ptbk coder run - live terminal
                </span>
                <span className="flex items-center gap-1.5 text-xs text-promptbook-green">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-promptbook-green" aria-hidden />
                    live
                </span>
            </div>
            <div
                ref={scrollContainerRef}
                aria-label="Simulated ptbk coder run dashboard"
                className="h-[31rem] overflow-auto p-4 font-mono text-[8px] leading-[1.25] text-gray-100 sm:text-[9px] md:h-[36rem]"
            >
                <div className="whitespace-pre-wrap break-words">
                    <span className="select-none text-gray-500">$ </span>
                    <span>{typedCommand}</span>
                    {isTypingCommand && <span className="animate-pulse text-promptbook-blue">▊</span>}
                </div>

                {currentFrame ? (
                    <pre className="mt-3 min-w-max whitespace-pre text-gray-100" aria-hidden="true">
                        {currentFrame.lines.join('\n')}
                    </pre>
                ) : null}
            </div>
        </div>
    );
}
