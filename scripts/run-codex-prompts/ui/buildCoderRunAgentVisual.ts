import {
    createAvatarDefinitionFromAgentBasicInformation,
    DEFAULT_AVATAR_SIZE,
} from '../../../src/avatars/avatarRenderingUtils';
import { resolveAvatarRenderDefinition } from '../../../src/avatars/renderAvatarVisual';
import { renderAvatarVisualAsciiArt } from '../../../src/avatars/renderAvatarVisualAsciiArt';
import { resolveAvatarVisualId } from '../../../src/avatars/visuals/avatarVisualRegistry';
import { parseAgentSource } from '../../../src/book-2.0/agent-source/parseAgentSource';
import type { string_book } from '../../../src/book-2.0/agent-source/string_book';
import {
    DEFAULT_AGENT_AVATAR_VISUAL_ID,
    resolveAgentAvatarVisualId,
} from '../../../src/utils/agents/resolveAgentAvatarImageUrl';
import { $detectTerminalAnsiColorDepth } from '../../../src/utils/ascii-art/$detectTerminalAnsiColorDepth';
import { keepUnused } from '../../../src/utils/organization/keepUnused';

/**
 * Output width of the coder-run agent visual in terminal character cells.
 *
 * @private internal constant of coder run UI
 */
export const CODER_RUN_AGENT_VISUAL_COLUMNS = 48;

/**
 * Output height of the coder-run agent visual in terminal character cells.
 *
 * @private internal constant of coder run UI
 */
export const CODER_RUN_AGENT_VISUAL_ROWS = 12;

/**
 * Aspect ratio of the source canvas used for the terminal variant.
 *
 * @private internal constant of coder run UI
 */
const CODER_RUN_AGENT_VISUAL_CANVAS_ASPECT_RATIO = 2;

/**
 * Source canvas width used before the avatar is converted to ASCII art.
 *
 * @private internal constant of coder run UI
 */
const CODER_RUN_AGENT_VISUAL_CANVAS_WIDTH = DEFAULT_AVATAR_SIZE * CODER_RUN_AGENT_VISUAL_CANVAS_ASPECT_RATIO;

/**
 * Source canvas height used before the avatar is converted to ASCII art.
 *
 * @private internal constant of coder run UI
 */
const CODER_RUN_AGENT_VISUAL_CANVAS_HEIGHT = DEFAULT_AVATAR_SIZE;

/**
 * Options passed by the terminal UI when rendering one animated agent visual frame.
 *
 * @private internal type of coder run UI
 */
export type CoderRunAgentVisualFrameOptions = {
    /**
     * Current animation time forwarded to the shared avatar renderer.
     */
    readonly animationTimeMs: number;
};

/**
 * Runtime renderer for the `--agent` avatar visual shown in the coder-run terminal UI.
 *
 * @private internal type of coder run UI
 */
export type CoderRunAgentVisual = {
    /**
     * Whether the selected built-in visual changes over time.
     */
    readonly isAnimated: boolean;

    /**
     * Renders one ANSI ASCII-art frame for the current terminal timestamp.
     */
    readonly renderFrame: (options: CoderRunAgentVisualFrameOptions) => ReadonlyArray<string>;
};

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

        const agentBasicInformation = parseAgentSource(agentSource);
        const avatarDefinition = createAvatarDefinitionFromAgentBasicInformation(agentBasicInformation);
        const avatarVisualId = resolveAgentAvatarVisualId(
            agentBasicInformation,
            resolveAvatarVisualId(agentBasicInformation.meta.visual) || DEFAULT_AGENT_AVATAR_VISUAL_ID,
        );
        const resolvedAvatarRenderDefinition = resolveAvatarRenderDefinition({
            avatarDefinition,
            visualId: avatarVisualId,
            surface: 'transparent',
        });
        const colorDepth = $detectTerminalAnsiColorDepth();
        const createCanvasForAsciiArt = (width: number, height: number) =>
            createCanvas(width, height) as unknown as HTMLCanvasElement;

        return {
            isAnimated: resolvedAvatarRenderDefinition.avatarVisual.isAnimated,
            renderFrame({ animationTimeMs }) {
                try {
                    return renderAvatarVisualAsciiArt({
                        avatarDefinition,
                        visualId: avatarVisualId,
                        surface: 'transparent',
                        columns: CODER_RUN_AGENT_VISUAL_COLUMNS,
                        rows: CODER_RUN_AGENT_VISUAL_ROWS,
                        canvasWidth: CODER_RUN_AGENT_VISUAL_CANVAS_WIDTH,
                        canvasHeight: CODER_RUN_AGENT_VISUAL_CANVAS_HEIGHT,
                        colorDepth,
                        timeMs: animationTimeMs,
                        createCanvas: createCanvasForAsciiArt,
                        resolvedAvatarRenderDefinition,
                    });
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
