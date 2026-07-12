'use client';

import { useEffect, useRef, useState } from 'react';
import { DEVELOPER_AGENT_BOOK } from '@/data/developerAgentBook';
import {
    createAvatarDefinitionFromAgentBasicInformation,
    DEFAULT_AVATAR_SIZE,
} from '@promptbook-source/avatars/avatarRenderingUtils';
import { renderAvatarVisualAsciiArt } from '@promptbook-source/avatars/renderAvatarVisualAsciiArt';
import { resolveAvatarRenderDefinition } from '@promptbook-source/avatars/renderAvatarVisual';
import { resolveAvatarVisualId } from '@promptbook-source/avatars/visuals/avatarVisualRegistry';
import { parseAgentSource } from '@promptbook-source/book-2.0/agent-source/parseAgentSource';
import {
    DEFAULT_AGENT_AVATAR_VISUAL_ID,
    resolveAgentAvatarVisualId,
} from '@promptbook-source/utils/agents/resolveAgentAvatarImageUrl';
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
 * Output width of the landing terminal agent visual in terminal character cells.
 */
const LIVE_DEMO_AGENT_VISUAL_COLUMNS = 48;

/**
 * Output height of the landing terminal agent visual in terminal character cells.
 */
const LIVE_DEMO_AGENT_VISUAL_ROWS = 12;

/**
 * Aspect ratio of the source canvas used for the terminal variant.
 */
const LIVE_DEMO_AGENT_VISUAL_CANVAS_ASPECT_RATIO = 2;

/**
 * Source canvas width used before the avatar is converted to ASCII art.
 */
const LIVE_DEMO_AGENT_VISUAL_CANVAS_WIDTH = DEFAULT_AVATAR_SIZE * LIVE_DEMO_AGENT_VISUAL_CANVAS_ASPECT_RATIO;

/**
 * Source canvas height used before the avatar is converted to ASCII art.
 */
const LIVE_DEMO_AGENT_VISUAL_CANVAS_HEIGHT = DEFAULT_AVATAR_SIZE;

/**
 * Refresh interval matching the rich `ptbk coder run` terminal UI cadence.
 */
const LIVE_DEMO_AGENT_VISUAL_REFRESH_INTERVAL_MS = 300;

/**
 * Parsed landing demo agent source used for the same avatar resolution path as `ptbk coder run --agent`.
 */
const LIVE_DEMO_AGENT_BASIC_INFORMATION = parseAgentSource(DEVELOPER_AGENT_BOOK);

/**
 * Stable avatar definition derived from the demo agent book.
 */
const LIVE_DEMO_AVATAR_DEFINITION = createAvatarDefinitionFromAgentBasicInformation(LIVE_DEMO_AGENT_BASIC_INFORMATION);

/**
 * Built-in avatar visual resolved from the demo agent book.
 */
const LIVE_DEMO_AVATAR_VISUAL_ID = resolveAgentAvatarVisualId(
    LIVE_DEMO_AGENT_BASIC_INFORMATION,
    resolveAvatarVisualId(LIVE_DEMO_AGENT_BASIC_INFORMATION.meta.visual) || DEFAULT_AGENT_AVATAR_VISUAL_ID,
);

/**
 * Stable render inputs reused across browser-side ASCII frames.
 */
const LIVE_DEMO_RESOLVED_AVATAR_RENDER_DEFINITION = resolveAvatarRenderDefinition({
    avatarDefinition: LIVE_DEMO_AVATAR_DEFINITION,
    visualId: LIVE_DEMO_AVATAR_VISUAL_ID,
    surface: 'transparent',
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
                    renderAvatarVisualAsciiArt({
                        avatarDefinition: LIVE_DEMO_AVATAR_DEFINITION,
                        visualId: LIVE_DEMO_AVATAR_VISUAL_ID,
                        surface: 'transparent',
                        columns: LIVE_DEMO_AGENT_VISUAL_COLUMNS,
                        rows: LIVE_DEMO_AGENT_VISUAL_ROWS,
                        canvasWidth: LIVE_DEMO_AGENT_VISUAL_CANVAS_WIDTH,
                        canvasHeight: LIVE_DEMO_AGENT_VISUAL_CANVAS_HEIGHT,
                        timeMs: performance.now() - animationStartedAtMs,
                        createCanvas,
                        resolvedAvatarRenderDefinition: LIVE_DEMO_RESOLVED_AVATAR_RENDER_DEFINITION,
                    }),
                );
            } catch {
                setTerminalVisualLines([]);
            }
        }

        renderFrame();

        if (!isAnimationActive) {
            return;
        }

        const intervalId = window.setInterval(renderFrame, LIVE_DEMO_AGENT_VISUAL_REFRESH_INTERVAL_MS);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [isAnimationActive]);

    if (terminalVisualLines.length === 0) {
        return null;
    }

    return (
        <div className="py-1 text-[10px] leading-none md:text-[11px]" aria-hidden>
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
