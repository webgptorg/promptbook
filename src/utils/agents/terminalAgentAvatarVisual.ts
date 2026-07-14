import { createAvatarDefinitionFromAgentBasicInformation, DEFAULT_AVATAR_SIZE } from '../../avatars/avatarRenderingUtils';
import type { ResolvedAvatarRenderDefinition } from '../../avatars/renderAvatarVisual';
import { resolveAvatarRenderDefinition } from '../../avatars/renderAvatarVisual';
import type { CreateCanvasForAsciiArt } from '../../avatars/renderAvatarVisualAsciiArt';
import { renderAvatarVisualAsciiArt } from '../../avatars/renderAvatarVisualAsciiArt';
import type { AvatarDefinition } from '../../avatars/types/AvatarDefinition';
import type { AvatarVisualId } from '../../avatars/types/AvatarVisualDefinition';
import { resolveAvatarVisualId } from '../../avatars/visuals/avatarVisualRegistry';
import type { AgentBasicInformation } from '../../book-2.0/agent-source/AgentBasicInformation';
import { parseAgentSource } from '../../book-2.0/agent-source/parseAgentSource';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import type { AsciiArtColorDepth } from '../ascii-art/convertImageDataToAsciiArt';
import { DEFAULT_AGENT_AVATAR_VISUAL_ID, resolveAgentAvatarVisualId } from './resolveAgentAvatarImageUrl';

// Note: [💞] Ignore a discrepancy between file name and entity name

/**
 * Output width of the terminal agent avatar visual in character cells.
 *
 * @private shared helper for terminal avatar rendering
 */
export const TERMINAL_AGENT_AVATAR_VISUAL_COLUMNS = 48;

/**
 * Output height of the terminal agent avatar visual in character cells.
 *
 * @private shared helper for terminal avatar rendering
 */
export const TERMINAL_AGENT_AVATAR_VISUAL_ROWS = 12;

/**
 * Refresh cadence used while a terminal agent avatar visual is animated.
 *
 * @private shared helper for terminal avatar rendering
 */
export const TERMINAL_AGENT_AVATAR_VISUAL_REFRESH_INTERVAL_MS = 300;

/**
 * Centers ANSI-colored terminal avatar lines within one terminal frame.
 *
 * @param lines ANSI-colored avatar lines.
 * @param frameColumns Available frame width in terminal character cells.
 * @returns Avatar lines with leading terminal spaces added.
 *
 * @private shared helper for terminal avatar rendering
 */
export function centerTerminalAgentAvatarVisualLines(
    lines: ReadonlyArray<string>,
    frameColumns: number,
): ReadonlyArray<string> {
    return lines.map((line) => centerTerminalAgentAvatarVisualLine(line, frameColumns));
}

/**
 * Aspect ratio of the source canvas used for the terminal avatar variant.
 *
 * @private shared helper for terminal avatar rendering
 */
const TERMINAL_AGENT_AVATAR_VISUAL_CANVAS_ASPECT_RATIO = 2;

/**
 * Source canvas width used before the avatar is converted to ASCII art.
 *
 * @private shared helper for terminal avatar rendering
 */
const TERMINAL_AGENT_AVATAR_VISUAL_CANVAS_WIDTH =
    DEFAULT_AVATAR_SIZE * TERMINAL_AGENT_AVATAR_VISUAL_CANVAS_ASPECT_RATIO;

/**
 * Source canvas height used before the avatar is converted to ASCII art.
 *
 * @private shared helper for terminal avatar rendering
 */
const TERMINAL_AGENT_AVATAR_VISUAL_CANVAS_HEIGHT = DEFAULT_AVATAR_SIZE;

/**
 * Options passed when rendering one animated terminal avatar frame.
 *
 * @private shared helper for terminal avatar rendering
 */
export type TerminalAgentAvatarVisualFrameOptions = {
    /**
     * Current animation time forwarded to the shared avatar renderer.
     */
    readonly animationTimeMs: number;
};

/**
 * Runtime renderer for an agent avatar visual shown in a terminal.
 *
 * @private shared helper for terminal avatar rendering
 */
export type TerminalAgentAvatarVisual = {
    /**
     * Whether the selected built-in visual changes over time.
     */
    readonly isAnimated: boolean;

    /**
     * Renders one ANSI ASCII-art frame for the current terminal timestamp.
     */
    readonly renderFrame: (options: TerminalAgentAvatarVisualFrameOptions) => ReadonlyArray<string>;
};

/**
 * Options for creating a terminal avatar visual renderer from an agent book source.
 *
 * @private shared helper for terminal avatar rendering
 */
export type CreateTerminalAgentAvatarVisualOptions = {
    /**
     * Source of the agent book whose metadata controls avatar identity.
     */
    readonly agentSource: string_book;

    /**
     * Built-in avatar visual used when the agent does not declare `META AVATAR` or `META VISUAL`.
     */
    readonly defaultAvatarVisualId?: AvatarVisualId;

    /**
     * Color depth of the emitted ANSI escape codes.
     */
    readonly colorDepth?: AsciiArtColorDepth;

    /**
     * Platform-specific canvas factory used to rasterize the visual.
     */
    readonly createCanvas: CreateCanvasForAsciiArt;
};

/**
 * Stable render inputs derived from an agent source for terminal avatar frames.
 *
 * @private shared helper for terminal avatar rendering
 */
type TerminalAgentAvatarVisualRenderInputs = {
    /**
     * Stable identity payload used by the shared avatar renderer.
     */
    readonly avatarDefinition: AvatarDefinition;

    /**
     * Built-in avatar visual selected for terminal rendering.
     */
    readonly avatarVisualId: AvatarVisualId;

    /**
     * Resolved render data reused across animation frames.
     */
    readonly resolvedAvatarRenderDefinition: ResolvedAvatarRenderDefinition;
};

/**
 * Resolves the built-in avatar visual selected for terminal rendering of one agent source.
 *
 * @param agentSource Source of the agent book.
 * @param defaultAvatarVisualId Built-in fallback used when the source does not declare an avatar visual.
 * @returns Supported built-in avatar visual id.
 *
 * @private shared helper for terminal avatar rendering
 */
export function resolveTerminalAgentAvatarVisualId(
    agentSource: string_book,
    defaultAvatarVisualId: AvatarVisualId = DEFAULT_AGENT_AVATAR_VISUAL_ID,
): AvatarVisualId {
    const agentBasicInformation = parseAgentSource(agentSource);

    return resolveTerminalAgentAvatarVisualIdFromAgentBasicInformation(agentBasicInformation, defaultAvatarVisualId);
}

/**
 * Creates an ANSI ASCII-art avatar renderer for terminal UIs.
 *
 * The agent's avatar visual is resolved the same way as on the website: `META AVATAR`
 * / `META VISUAL` wins, then the provided fallback visual, then the shared default visual.
 * The terminal variant uses a transparent horizontal canvas instead of the website's framed square surface.
 *
 * @param options Agent source, canvas factory, and optional terminal color settings.
 * @returns Runtime terminal avatar visual renderer.
 *
 * @private shared helper for terminal avatar rendering
 */
export function createTerminalAgentAvatarVisual(
    options: CreateTerminalAgentAvatarVisualOptions,
): TerminalAgentAvatarVisual {
    const renderInputs = createTerminalAgentAvatarVisualRenderInputs(
        options.agentSource,
        options.defaultAvatarVisualId || DEFAULT_AGENT_AVATAR_VISUAL_ID,
    );

    return {
        isAnimated: renderInputs.resolvedAvatarRenderDefinition.avatarVisual.isAnimated,
        renderFrame({ animationTimeMs }) {
            return renderTerminalAgentAvatarVisualFrame({
                ...renderInputs,
                animationTimeMs,
                colorDepth: options.colorDepth,
                createCanvas: options.createCanvas,
            });
        },
    };
}

/**
 * Creates stable avatar render inputs from one agent source.
 *
 * @private shared helper for terminal avatar rendering
 */
function createTerminalAgentAvatarVisualRenderInputs(
    agentSource: string_book,
    defaultAvatarVisualId: AvatarVisualId,
): TerminalAgentAvatarVisualRenderInputs {
    const agentBasicInformation = parseAgentSource(agentSource);
    const avatarDefinition = createAvatarDefinitionFromAgentBasicInformation(agentBasicInformation);
    const avatarVisualId = resolveTerminalAgentAvatarVisualIdFromAgentBasicInformation(
        agentBasicInformation,
        defaultAvatarVisualId,
    );
    const resolvedAvatarRenderDefinition = resolveAvatarRenderDefinition({
        avatarDefinition,
        visualId: avatarVisualId,
        surface: 'transparent',
    });

    return {
        avatarDefinition,
        avatarVisualId,
        resolvedAvatarRenderDefinition,
    };
}

/**
 * Resolves the terminal avatar visual id from already parsed agent information.
 *
 * @private shared helper for terminal avatar rendering
 */
function resolveTerminalAgentAvatarVisualIdFromAgentBasicInformation(
    agentBasicInformation: AgentBasicInformation,
    defaultAvatarVisualId: AvatarVisualId,
): AvatarVisualId {
    return resolveAgentAvatarVisualId(
        agentBasicInformation,
        resolveAvatarVisualId(agentBasicInformation.meta.visual) || defaultAvatarVisualId,
    );
}

/**
 * Renders one terminal avatar frame through the shared avatar-to-ASCII pipeline.
 *
 * @private shared helper for terminal avatar rendering
 */
function renderTerminalAgentAvatarVisualFrame(
    options: TerminalAgentAvatarVisualRenderInputs & {
        readonly animationTimeMs: number;
        readonly colorDepth?: AsciiArtColorDepth;
        readonly createCanvas: CreateCanvasForAsciiArt;
    },
): ReadonlyArray<string> {
    return renderAvatarVisualAsciiArt({
        avatarDefinition: options.avatarDefinition,
        visualId: options.avatarVisualId,
        surface: 'transparent',
        columns: TERMINAL_AGENT_AVATAR_VISUAL_COLUMNS,
        rows: TERMINAL_AGENT_AVATAR_VISUAL_ROWS,
        canvasWidth: TERMINAL_AGENT_AVATAR_VISUAL_CANVAS_WIDTH,
        canvasHeight: TERMINAL_AGENT_AVATAR_VISUAL_CANVAS_HEIGHT,
        colorDepth: options.colorDepth,
        timeMs: options.animationTimeMs,
        createCanvas: options.createCanvas,
        resolvedAvatarRenderDefinition: options.resolvedAvatarRenderDefinition,
    });
}

/**
 * Centers one ANSI-colored terminal avatar line within the available frame width.
 *
 * @private shared helper for terminal avatar rendering
 */
function centerTerminalAgentAvatarVisualLine(line: string, frameColumns: number): string {
    const paddingWidth = Math.max(
        0,
        Math.floor((frameColumns - getTerminalAgentAvatarVisualLineVisibleLength(line)) / 2),
    );

    return `${' '.repeat(paddingWidth)}${line}`;
}

/**
 * Measures one terminal avatar line without ANSI escape sequences.
 *
 * @private shared helper for terminal avatar rendering
 */
function getTerminalAgentAvatarVisualLineVisibleLength(line: string): number {
    return stripTerminalAgentAvatarVisualAnsi(line).length;
}

/**
 * Removes ANSI escape sequences that do not occupy terminal character cells.
 *
 * @private shared helper for terminal avatar rendering
 */
function stripTerminalAgentAvatarVisualAnsi(line: string): string {
    // eslint-disable-next-line no-control-regex
    return line.replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '').replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '');
}
