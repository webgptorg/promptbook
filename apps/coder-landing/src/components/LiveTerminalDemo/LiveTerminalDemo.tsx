'use client';

import { useEffect, useRef, useState } from 'react';
import type { LiveDemoLine } from '@/data/liveDemoScript';
import { LIVE_DEMO_LOOP_PAUSE_MS, LIVE_DEMO_SCRIPT, LIVE_DEMO_TYPING_INTERVAL_MS } from '@/data/liveDemoScript';

/**
 * CSS classes used for individual line tones of the fake live terminal.
 */
const LIVE_DEMO_TONE_CLASS_NAMES: Record<LiveDemoLine['tone'], string> = {
    command: 'text-gray-100',
    plain: 'text-gray-200',
    success: 'text-promptbook-green',
    info: 'text-promptbook-blue',
    muted: 'text-gray-400',
    accent: 'text-promptbook-blue font-semibold',
};

/**
 * Renders one "live" preview of `ptbk coder` in action - a fake terminal which
 * types the server command and replays a scripted coding session in a loop.
 *
 * Note: Specified in [`specs/components/live-terminal.md`](../../../specs/components/live-terminal.md)
 */
export function LiveTerminalDemo() {
    const [visibleLines, setVisibleLines] = useState<ReadonlyArray<LiveDemoLine>>([]);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let isCancelled = false;

        function waitFor(milliseconds: number): Promise<void> {
            return new Promise((resolve) => setTimeout(resolve, milliseconds));
        }

        async function playScript() {
            while (!isCancelled) {
                setVisibleLines([]);

                for (const line of LIVE_DEMO_SCRIPT) {
                    await waitFor(line.delayMs);
                    if (isCancelled) {
                        return;
                    }

                    if (line.tone === 'command') {
                        // Note: Command lines are typed character by character
                        setVisibleLines((previousLines) => [...previousLines, { ...line, text: '' }]);
                        for (
                            let typedCharacterCount = 1;
                            typedCharacterCount <= line.text.length;
                            typedCharacterCount++
                        ) {
                            await waitFor(LIVE_DEMO_TYPING_INTERVAL_MS);
                            if (isCancelled) {
                                return;
                            }
                            setVisibleLines((previousLines) => [
                                ...previousLines.slice(0, -1),
                                { ...line, text: line.text.slice(0, typedCharacterCount) },
                            ]);
                        }
                    } else {
                        setVisibleLines((previousLines) => [...previousLines, line]);
                    }
                }

                await waitFor(LIVE_DEMO_LOOP_PAUSE_MS);
            }
        }

        playScript();

        return () => {
            isCancelled = true;
        };
    }, []);

    // Note: Keep the terminal scrolled to the latest line
    useEffect(() => {
        const scrollContainer = scrollContainerRef.current;
        if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
    }, [visibleLines]);

    return (
        <div className="rounded-xl border border-gray-700/70 bg-[#0d1117] shadow-2xl shadow-black/40 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-gray-800 bg-[#161b22] px-4 py-2.5">
                <span className="h-3 w-3 rounded-full bg-[#ff5f57]" aria-hidden />
                <span className="h-3 w-3 rounded-full bg-[#febc2e]" aria-hidden />
                <span className="h-3 w-3 rounded-full bg-[#28c840]" aria-hidden />
                <span className="ml-2 flex-1 truncate text-xs text-gray-400 font-mono">
                    ptbk coder server — live preview
                </span>
                <span className="flex items-center gap-1.5 text-xs text-promptbook-green">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-promptbook-green" aria-hidden />
                    live
                </span>
            </div>
            <div
                ref={scrollContainerRef}
                aria-label="Simulated ptbk coder session"
                className="h-80 overflow-y-auto p-4 text-[13px] leading-relaxed font-mono md:h-96"
            >
                {visibleLines.map((line, lineIndex) => {
                    const isLastLine = lineIndex === visibleLines.length - 1;
                    return (
                        <div key={lineIndex} className="whitespace-pre-wrap break-words">
                            {line.tone === 'command' && <span className="select-none text-gray-500">$ </span>}
                            <span className={LIVE_DEMO_TONE_CLASS_NAMES[line.tone]}>{line.text}</span>
                            {isLastLine && <span className="animate-pulse text-promptbook-blue">▊</span>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
