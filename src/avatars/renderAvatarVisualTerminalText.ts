import { createIdleAvatarInteractionState } from './avatarInteractionUtils';
import type { AsciiArtColorDepth } from '../utils/ascii-art/createAnsiColorCode';
import { ANSI_RESET, createAnsiColorCode } from '../utils/ascii-art/createAnsiColorCode';
import { parseColorString } from '../utils/color/parseColorString';
import type { ResolvedAvatarRenderDefinition } from './renderAvatarVisual';
import { resolveAvatarRenderDefinition } from './renderAvatarVisual';
import type { AvatarDefinition } from './types/AvatarDefinition';
import type {
    AvatarSurfaceStyle,
    AvatarVisualId,
    AvatarVisualTerminalTextCell,
} from './types/AvatarVisualDefinition';

/**
 * Options for `renderAvatarVisualTerminalText`.
 *
 * @private within the repository
 */
export type RenderAvatarVisualTerminalTextOptions = {
    /**
     * Stable visual identity of the rendered agent avatar.
     */
    readonly avatarDefinition: AvatarDefinition;

    /**
     * Built-in avatar visual to render, the same one used on the website.
     */
    readonly visualId: AvatarVisualId;

    /**
     * Surface used by the visual.
     *
     * @default 'framed'
     */
    readonly surface?: AvatarSurfaceStyle;

    /**
     * Output width in terminal character cells.
     */
    readonly columns: number;

    /**
     * Output height in terminal character cells.
     */
    readonly rows: number;

    /**
     * Color depth of the emitted ANSI escape codes.
     *
     * @default 'TRUE_COLOR'
     */
    readonly colorDepth?: AsciiArtColorDepth;

    /**
     * Animation timestamp for animated visuals.
     */
    readonly timeMs: number;

    /**
     * Optional stable render data reused across frames.
     */
    readonly resolvedAvatarRenderDefinition?: ResolvedAvatarRenderDefinition;
};

/**
 * Renders one built-in avatar visual as native ANSI-colored terminal text.
 *
 * Visuals which are made of characters - for example the `AsciiOctopus` visual - would lose their
 * identity if they were rasterized onto a canvas and converted back into half-block ASCII art,
 * because a whole glyph then collapses into roughly one output cell. Such visuals paint the terminal
 * grid directly through their own `renderTerminalText` renderer, which is what this function drives.
 *
 * Visuals without a terminal-text renderer return `null` so the caller can rasterize them through
 * `renderAvatarVisualAsciiArt` instead.
 *
 * Note: Cell colors are used at full brightness; their alpha only tunes the canvas variant.
 *
 * @param options Avatar identity, visual selection, output grid size, and animation time.
 * @returns One ANSI-colored string per output row or `null` when the visual has no terminal-text renderer.
 *
 * @private within the repository
 */
export function renderAvatarVisualTerminalText(
    options: RenderAvatarVisualTerminalTextOptions,
): ReadonlyArray<string> | null {
    const resolvedAvatarRenderDefinition =
        options.resolvedAvatarRenderDefinition ||
        resolveAvatarRenderDefinition({
            avatarDefinition: options.avatarDefinition,
            visualId: options.visualId,
            surface: options.surface,
        });
    const { renderTerminalText } = resolvedAvatarRenderDefinition.avatarVisual;

    if (!renderTerminalText) {
        return null;
    }

    const cellRows = renderTerminalText({
        columns: options.columns,
        rows: options.rows,
        timeMs: options.timeMs,
        avatarDefinition: resolvedAvatarRenderDefinition.avatarDefinition,
        palette: resolvedAvatarRenderDefinition.palette,
        createRandom: resolvedAvatarRenderDefinition.createRandom,
        interaction: createIdleAvatarInteractionState(),
    });

    return cellRows.map((cellRow) => convertTerminalTextCellRowToAnsiLine(cellRow, options.colorDepth));
}

/**
 * Converts one row of character cells into an ANSI-colored terminal line.
 *
 * Color escape codes are emitted only when the color really changes, so one row of the same color
 * stays a single escape sequence followed by its characters.
 *
 * @private helper of `renderAvatarVisualTerminalText`
 */
function convertTerminalTextCellRowToAnsiLine(
    cellRow: ReadonlyArray<AvatarVisualTerminalTextCell | null>,
    colorDepth: AsciiArtColorDepth = 'TRUE_COLOR',
): string {
    let line = '';
    let currentColorCode: string | undefined = undefined;

    for (const cell of cellRow) {
        if (cell === null) {
            if (currentColorCode !== undefined) {
                line += ANSI_RESET;
                currentColorCode = undefined;
            }

            line += ' ';
            continue;
        }

        const nextColorCode = createAnsiColorCode(parseColorString(cell.color), 'foreground', colorDepth);

        if (nextColorCode !== currentColorCode) {
            line += nextColorCode;
            currentColorCode = nextColorCode;
        }

        line += cell.character;
    }

    if (currentColorCode !== undefined) {
        line += ANSI_RESET;
    }

    return line;
}
