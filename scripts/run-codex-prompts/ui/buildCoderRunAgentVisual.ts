import { createAvatarDefinitionFromAgentBasicInformation } from '../../../src/avatars/avatarRenderingUtils';
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
export const CODER_RUN_AGENT_VISUAL_COLUMNS = 24;

/**
 * Output height of the coder-run agent visual in terminal character cells.
 *
 * Half of the columns keeps the square avatar visually square in a common terminal font.
 *
 * @private internal constant of coder run UI
 */
export const CODER_RUN_AGENT_VISUAL_ROWS = 12;

/**
 * Builds the ANSI ASCII-art visual of the `--agent` book shown above the coder-run dashboard.
 *
 * The agent's avatar visual is resolved the same way as on the website - the `META AVATAR`
 * commitment wins, then the `META VISUAL` commitment, then the shared default visual - and is
 * rendered dynamically through the shared canvas avatar pipeline into terminal ASCII art.
 *
 * The visual is decorative, so any failure (for example when the optional `@napi-rs/canvas`
 * module is not installed) returns `null` and the caller keeps the default brand banner.
 *
 * @param agentSource Source of the `--agent` book file.
 * @returns ANSI-colored ASCII-art lines or `null` when the visual cannot be rendered.
 */
export async function buildCoderRunAgentVisual(agentSource: string_book): Promise<ReadonlyArray<string> | null> {
    try {
        // Note: `@napi-rs/canvas` is an optional native module, so it is imported dynamically and lazily
        const { createCanvas } = await import('@napi-rs/canvas');

        const agentBasicInformation = parseAgentSource(agentSource);
        const avatarDefinition = createAvatarDefinitionFromAgentBasicInformation(agentBasicInformation);
        const avatarVisualId = resolveAgentAvatarVisualId(
            agentBasicInformation,
            resolveAvatarVisualId(agentBasicInformation.meta.visual) || DEFAULT_AGENT_AVATAR_VISUAL_ID,
        );

        return renderAvatarVisualAsciiArt({
            avatarDefinition,
            visualId: avatarVisualId,
            columns: CODER_RUN_AGENT_VISUAL_COLUMNS,
            rows: CODER_RUN_AGENT_VISUAL_ROWS,
            colorDepth: $detectTerminalAnsiColorDepth(),
            createCanvas: (width: number, height: number) =>
                createCanvas(width, height) as unknown as HTMLCanvasElement,
        });
    } catch (error) {
        // Note: The agent visual is decorative - on any failure the coder UI falls back to the default banner
        keepUnused(error);
        return null;
    }
}
