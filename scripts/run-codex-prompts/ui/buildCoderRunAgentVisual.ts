import type { string_book } from '../../../src/book-2.0/agent-source/string_book';
import {
    createTerminalAgentAvatarVisual,
    TERMINAL_AGENT_AVATAR_VISUAL_COLUMNS,
    TERMINAL_AGENT_AVATAR_VISUAL_ROWS,
    type TerminalAgentAvatarVisual,
    type TerminalAgentAvatarVisualFrameOptions,
} from '../../../src/utils/agents/terminalAgentAvatarVisual';
import { $detectTerminalAnsiColorDepth } from '../../../src/utils/ascii-art/$detectTerminalAnsiColorDepth';
import { keepUnused } from '../../../src/utils/organization/keepUnused';

/**
 * Output width of the coder-run agent visual in terminal character cells.
 *
 * @private internal constant of coder run UI
 */
export const CODER_RUN_AGENT_VISUAL_COLUMNS = TERMINAL_AGENT_AVATAR_VISUAL_COLUMNS;

/**
 * Output height of the coder-run agent visual in terminal character cells.
 *
 * @private internal constant of coder run UI
 */
export const CODER_RUN_AGENT_VISUAL_ROWS = TERMINAL_AGENT_AVATAR_VISUAL_ROWS;

/**
 * Options passed by the terminal UI when rendering one animated agent visual frame.
 *
 * @private internal type of coder run UI
 */
export type CoderRunAgentVisualFrameOptions = TerminalAgentAvatarVisualFrameOptions;

/**
 * Runtime renderer for the `--agent` avatar visual shown in the coder-run terminal UI.
 *
 * @private internal type of coder run UI
 */
export type CoderRunAgentVisual = TerminalAgentAvatarVisual;

/**
 * Builds the ANSI ASCII-art visual of the `--agent` book shown above the coder-run dashboard.
 *
 * The agent's avatar visual is resolved the same way as on the website - the `META AVATAR`
 * commitment wins, then the `META VISUAL` commitment, then the shared default visual - and is
 * rendered dynamically through the shared canvas avatar pipeline into terminal ASCII art.
 * The terminal variant uses a transparent horizontal canvas instead of the website's framed 1:1 surface.
 *
 * The visual is decorative, so any failure (for example when the optional `@napi-rs/canvas`
 * module is not installed) returns `null` and the caller keeps the default brand banner.
 *
 * @param agentSource Source of the `--agent` book file.
 * @returns ANSI-colored ASCII-art renderer or `null` when the visual cannot be rendered.
 */
export async function buildCoderRunAgentVisual(agentSource: string_book): Promise<CoderRunAgentVisual | null> {
    try {
        // Note: `@napi-rs/canvas` is an optional native module, so it is imported dynamically and lazily
        const { createCanvas } = await import('@napi-rs/canvas');

        const colorDepth = $detectTerminalAnsiColorDepth();
        const createCanvasForAsciiArt = (width: number, height: number) =>
            createCanvas(width, height) as unknown as HTMLCanvasElement;
        const agentVisual = createTerminalAgentAvatarVisual({
            agentSource,
            colorDepth,
            createCanvas: createCanvasForAsciiArt,
        });

        return {
            isAnimated: agentVisual.isAnimated,
            renderFrame({ animationTimeMs }) {
                try {
                    return agentVisual.renderFrame({ animationTimeMs });
                } catch (error) {
                    keepUnused(error);
                    return [];
                }
            },
        };
    } catch (error) {
        // Note: The agent visual is decorative - on any failure the coder UI falls back to the default banner
        keepUnused(error);
        return null;
    }
}
