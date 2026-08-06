import type { string_color } from '../types/string_person_fullname';
import type { AsciiArtColorDepth } from '../utils/ascii-art/convertImageDataToAsciiArt';
import { DEFAULT_ALPHA_THRESHOLD } from '../utils/ascii-art/convertImageDataToAsciiArt';
import type { AnsiRgbColor } from '../utils/ascii-art/createAnsiColorCode';
import { ANSI_RESET, createAnsiForegroundColorCode } from '../utils/ascii-art/createAnsiColorCode';
import { Color } from '../utils/color/Color';
import { createIdleAvatarInteractionState } from './avatarInteractionUtils';
import type { ResolvedAvatarRenderDefinition } from './renderAvatarVisual';
import { resolveAvatarRenderDefinition } from './renderAvatarVisual';
import type { AvatarDefinition } from './types/AvatarDefinition';
import type {
    AvatarSurfaceStyle,
    AvatarVisualId,
    AvatarVisualTerminalTextCell,
    AvatarVisualTerminalTextGrid,
} from './types/AvatarVisualDefinition';

// Note: [💞] Ignore a discrepancy between file name and entity name

/**
 * Height of one terminal character cell relative to its width.
 *
 * Terminal fonts are roughly twice as tall as they are wide, so a square avatar needs
 * twice as many columns as rows to keep its proportions.
 *
 * @private within the repository
 */
const TERMINAL_CHARACTER_CELL_ASPECT_RATIO = 2;

/**
 * Options shared by the terminal-text avatar renderers.
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
     * Surface used to derive the avatar palette.
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
     * Animation timestamp for animated visuals.
     */
    readonly timeMs: number;

    /**
     * Optional stable render data reused across frames.
     */
    readonly resolvedAvatarRenderDefinition?: ResolvedAvatarRenderDefinition;
};

/**
 * Options for `renderAvatarVisualTerminalTextLines`.
 *
 * @private within the repository
 */
export type RenderAvatarVisualTerminalTextLinesOptions = RenderAvatarVisualTerminalTextOptions & {
    /**
     * Color depth of the emitted ANSI escape codes.
     *
     * @default 'TRUE_COLOR'
     */
    readonly colorDepth?: AsciiArtColorDepth;
};

/**
 * Renders one frame of a character-based avatar visual straight into terminal character cells.
 *
 * Visuals which are themselves made of characters, for example `AsciiOctopus`, lose their identity
 * when they are rasterized onto a canvas and converted back into half-block ASCII art - every glyph
 * is averaged away into a colored blob. Such visuals expose `renderTerminalText`, which paints the
 * terminal grid directly and is used instead of the raster pipeline.
 *
 * The square avatar is centered inside the requested grid the same way `renderAvatarVisualAsciiArt`
 * centers the avatar canvas inside a wider terminal frame.
 *
 * @param options Avatar identity, visual selection, and output grid size.
 * @returns Grid of `rows` rows of `columns` cells, or `null` when the visual has no terminal renderer.
 *
 * @private within the repository
 */
export function renderAvatarVisualTerminalTextGrid(
    options: RenderAvatarVisualTerminalTextOptions,
): AvatarVisualTerminalTextGrid | null {
    const resolvedRenderDefinition =
        options.resolvedAvatarRenderDefinition ||
        resolveAvatarRenderDefinition({
            avatarDefinition: options.avatarDefinition,
            visualId: options.visualId,
            surface: options.surface,
        });
    const { renderTerminalText } = resolvedRenderDefinition.avatarVisual;

    if (renderTerminalText === undefined) {
        return null;
    }

    const avatarColumnCount = Math.min(options.columns, options.rows * TERMINAL_CHARACTER_CELL_ASPECT_RATIO);
    const avatarRowCount = Math.min(options.rows, Math.round(options.columns / TERMINAL_CHARACTER_CELL_ASPECT_RATIO));

    if (avatarColumnCount <= 0 || avatarRowCount <= 0) {
        return null;
    }

    const avatarGrid = renderTerminalText({
        columns: avatarColumnCount,
        rows: avatarRowCount,
        timeMs: options.timeMs,
        avatarDefinition: resolvedRenderDefinition.avatarDefinition,
        palette: resolvedRenderDefinition.palette,
        createRandom: resolvedRenderDefinition.createRandom,
        interaction: createIdleAvatarInteractionState(),
    });

    return centerAvatarVisualTerminalTextGrid(avatarGrid, options.columns, options.rows);
}

/**
 * Renders one frame of a character-based avatar visual into ANSI-colored terminal lines.
 *
 * @param options Avatar identity, visual selection, output grid size, and ANSI color depth.
 * @returns One ANSI-colored string per output row, or `null` when the visual has no terminal renderer.
 *
 * @private within the repository
 */
export function renderAvatarVisualTerminalTextLines(
    options: RenderAvatarVisualTerminalTextLinesOptions,
): ReadonlyArray<string> | null {
    const terminalTextGrid = renderAvatarVisualTerminalTextGrid(options);

    if (terminalTextGrid === null) {
        return null;
    }

    return terminalTextGrid.map((terminalTextRow) =>
        buildAvatarVisualTerminalTextLine(terminalTextRow, options.colorDepth || 'TRUE_COLOR'),
    );
}

/**
 * Converts one avatar cell color into the opaque terminal color it is painted with.
 *
 * Terminal cells cannot be blended, so the cell alpha is composited onto the dark terminal
 * background and fully transparent cells keep the terminal background instead.
 *
 * @param color Cell color as a CSS color string, optionally with an alpha channel.
 * @returns Opaque terminal color or `null` when the cell should stay empty.
 *
 * @private helper of `renderAvatarVisualTerminalTextLines`
 */
function resolveAvatarVisualTerminalTextColor(color: string_color): AnsiRgbColor | null {
    const parsedColor = Color.fromSafe(color);

    if (parsedColor.alpha < DEFAULT_ALPHA_THRESHOLD) {
        return null;
    }

    const opacity = parsedColor.alpha / 255;

    return {
        red: Math.round(parsedColor.red * opacity),
        green: Math.round(parsedColor.green * opacity),
        blue: Math.round(parsedColor.blue * opacity),
    };
}

/**
 * Places the square avatar grid into the center of the requested terminal grid.
 *
 * @private helper of `renderAvatarVisualTerminalTextGrid`
 */
function centerAvatarVisualTerminalTextGrid(
    avatarGrid: AvatarVisualTerminalTextGrid,
    columns: number,
    rows: number,
): AvatarVisualTerminalTextGrid {
    const avatarRowCount = avatarGrid.length;
    const avatarColumnCount = avatarGrid[0]?.length || 0;
    const leftCellCount = Math.floor((columns - avatarColumnCount) / 2);
    const topRowCount = Math.floor((rows - avatarRowCount) / 2);

    return Array.from({ length: rows }, (_, rowIndex) => {
        const avatarRow = avatarGrid[rowIndex - topRowCount];

        return Array.from({ length: columns }, (__, columnIndex) => avatarRow?.[columnIndex - leftCellCount] || null);
    });
}

/**
 * Builds one ANSI-colored terminal line from resolved character cells.
 *
 * @private helper of `renderAvatarVisualTerminalTextLines`
 */
function buildAvatarVisualTerminalTextLine(
    terminalTextRow: ReadonlyArray<AvatarVisualTerminalTextCell | null>,
    colorDepth: AsciiArtColorDepth,
): string {
    let line = '';
    let currentForegroundCode: string | undefined = undefined;

    for (const terminalTextCell of terminalTextRow) {
        const cellColor =
            terminalTextCell === null ? null : resolveAvatarVisualTerminalTextColor(terminalTextCell.color);
        const nextForegroundCode =
            cellColor === null ? undefined : createAnsiForegroundColorCode(cellColor, colorDepth);

        if (nextForegroundCode !== currentForegroundCode) {
            // Note: A reset is required whenever a previously set color must be cleared,
            //       otherwise a stale color would bleed into the following empty cells.
            if (nextForegroundCode === undefined) {
                line += ANSI_RESET;
            } else {
                line += nextForegroundCode;
            }

            currentForegroundCode = nextForegroundCode;
        }

        line += cellColor === null || terminalTextCell === null ? ' ' : terminalTextCell.character;
    }

    if (currentForegroundCode !== undefined) {
        line += ANSI_RESET;
    }

    return line;
}
