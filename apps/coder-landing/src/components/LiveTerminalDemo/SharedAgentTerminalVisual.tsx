'use client';

import { useEffect, useState } from 'react';
import { DEVELOPER_AGENT_BOOK } from '@/data/developerAgentBook';
import {
    createTerminalAgentAvatarVisual,
    TERMINAL_AGENT_AVATAR_VISUAL_REFRESH_INTERVAL_MS,
} from '@promptbook-source/utils/agents/terminalAgentAvatarVisual';
import { TerminalAnsiTextLine } from './TerminalAnsiTextLine';

/**
 * Shared terminal visual used by the real `ptbk coder run` UI and the landing live demo.
 *
 * The browser deliberately requests true-color ANSI output so the generated terminal characters can be
 * represented as CSS text spans without changing their terminal color values.
 */
const LIVE_DEMO_AGENT_TERMINAL_VISUAL = createTerminalAgentAvatarVisual({
    agentSource: DEVELOPER_AGENT_BOOK,
    colorDepth: 'TRUE_COLOR',
});

/**
 * Initial terminal frame, matching the zero-time frame produced when the CLI UI starts.
 */
const INITIAL_LIVE_DEMO_AGENT_TERMINAL_VISUAL_LINES = renderLiveDemoAgentTerminalVisualFrame(0);

/**
 * Renders the exact terminal ASCII visual used by `ptbk coder run` for the default developer agent.
 */
export function SharedAgentTerminalVisual() {
    const [agentVisualLines, setAgentVisualLines] = useState<ReadonlyArray<string>>(
        INITIAL_LIVE_DEMO_AGENT_TERMINAL_VISUAL_LINES,
    );

    useEffect(() => {
        if (!LIVE_DEMO_AGENT_TERMINAL_VISUAL.isAnimated) {
            return;
        }

        const animationStartTimeMs = Date.now();
        const animationInterval = window.setInterval(() => {
            setAgentVisualLines(renderLiveDemoAgentTerminalVisualFrame(Date.now() - animationStartTimeMs));
        }, TERMINAL_AGENT_AVATAR_VISUAL_REFRESH_INTERVAL_MS);

        return () => window.clearInterval(animationInterval);
    }, []);

    return (
        <div className="flex justify-center py-2" aria-hidden>
            <div className="whitespace-pre leading-tight">
                {agentVisualLines.map((agentVisualLine, agentVisualLineIndex) => (
                    <div key={agentVisualLineIndex}>
                        <TerminalAnsiTextLine line={agentVisualLine} />
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Produces one live-demo frame through the same shared renderer called by the coder CLI.
 */
function renderLiveDemoAgentTerminalVisualFrame(animationTimeMs: number): ReadonlyArray<string> {
    return LIVE_DEMO_AGENT_TERMINAL_VISUAL.renderFrame({ animationTimeMs });
}
