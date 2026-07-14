'use client';

import { useEffect, useRef, useState } from 'react';
import { DEVELOPER_AGENT_BOOK } from '@/data/developerAgentBook';
import { LIVE_DEMO_TERMINAL_BOX_WIDTH } from '@/data/liveDemoScript';
import {
    centerTerminalAgentAvatarVisualLines,
    createTerminalAgentAvatarVisual,
    TERMINAL_AGENT_AVATAR_VISUAL_REFRESH_INTERVAL_MS,
} from '@promptbook-source/utils/agents/terminalAgentAvatarVisual';
import type { AvatarVisualId } from '@promptbook-source/avatars/types/AvatarVisualDefinition';
import { AnsiTerminalLine } from './AnsiTerminalLine';

/**
 * Props of `<SharedAgentTerminalVisual/>`.
 */
type SharedAgentTerminalVisualProps = {
    /**
     * Whether the visual should keep advancing frames.
     */
    readonly isAnimationActive: boolean;
};

/**
 * Built-in fallback visual used by the landing live terminal sample.
 *
 * The actual Promptbook Developer coder agent in this repository declares the same visual,
 * while explicit `META AVATAR` / `META VISUAL` values in the demo source still take precedence.
 */
const LIVE_DEMO_AGENT_AVATAR_VISUAL_ID: AvatarVisualId = 'ascii-octopus';

/**
 * Shared terminal avatar renderer used by the landing live terminal sample.
 */
const LIVE_DEMO_AGENT_VISUAL = createTerminalAgentAvatarVisual({
    agentSource: DEVELOPER_AGENT_BOOK,
    defaultAvatarVisualId: LIVE_DEMO_AGENT_AVATAR_VISUAL_ID,
    createCanvas,
});

/**
 * Renders the same shared agent avatar visual as colored terminal text.
 */
export function SharedAgentTerminalVisual({ isAnimationActive }: SharedAgentTerminalVisualProps) {
    const animationStartedAtMsRef = useRef<number | null>(null);
    const [terminalVisualLines, setTerminalVisualLines] = useState<ReadonlyArray<string>>([]);

    useEffect(() => {
        if (animationStartedAtMsRef.current === null) {
            animationStartedAtMsRef.current = performance.now();
        }

        function renderFrame(): void {
            const animationStartedAtMs = animationStartedAtMsRef.current || performance.now();

            try {
                setTerminalVisualLines(
                    centerTerminalAgentAvatarVisualLines(
                        LIVE_DEMO_AGENT_VISUAL.renderFrame({
                            animationTimeMs: performance.now() - animationStartedAtMs,
                        }),
                        LIVE_DEMO_TERMINAL_BOX_WIDTH,
                    ),
                );
            } catch {
                setTerminalVisualLines([]);
            }
        }

        renderFrame();

        if (!isAnimationActive) {
            return;
        }

        const intervalId = window.setInterval(renderFrame, TERMINAL_AGENT_AVATAR_VISUAL_REFRESH_INTERVAL_MS);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [isAnimationActive]);

    if (terminalVisualLines.length === 0) {
        return null;
    }

    return (
        <div className="py-1 text-[10px] leading-tight md:text-[11px]" aria-hidden>
            {terminalVisualLines.map((line, lineIndex) => (
                <div key={lineIndex} className="whitespace-pre">
                    <AnsiTerminalLine line={line} />
                </div>
            ))}
        </div>
    );
}

/**
 * Creates a browser canvas for the shared avatar-to-ASCII renderer.
 */
function createCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
}
