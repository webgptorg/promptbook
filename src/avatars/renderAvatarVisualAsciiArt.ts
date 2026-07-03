import { spaceTrim } from 'spacetrim';
import { EnvironmentMismatchError } from '../errors/EnvironmentMismatchError';
import type { AsciiArtColorDepth } from '../utils/ascii-art/convertImageDataToAsciiArt';
import { convertImageDataToAsciiArt } from '../utils/ascii-art/convertImageDataToAsciiArt';
import { DEFAULT_AVATAR_SIZE } from './avatarRenderingUtils';
import { renderAvatarVisual } from './renderAvatarVisual';
import type { AvatarDefinition } from './types/AvatarDefinition';
import type { AvatarVisualId } from './types/AvatarVisualDefinition';

/**
 * Default output width of the ASCII avatar in terminal character cells.
 *
 * @private within the repository
 */
export const DEFAULT_AVATAR_ASCII_ART_COLUMNS = 32;

/**
 * Stable animation timestamp used when rasterizing animated avatar visuals into a static ASCII frame.
 *
 * @private within the repository
 */
const STATIC_AVATAR_ASCII_ART_FRAME_TIME_MS = 840;

/**
 * Factory creating a drawable canvas of the requested pixel size.
 *
 * In browsers this is typically `document.createElement('canvas')` (with width/height set),
 * in Node.js an adapter around `createCanvas` of `@napi-rs/canvas` or a compatible library.
 *
 * @private within the repository
 */
export type CreateCanvasForAsciiArt = (width: number, height: number) => HTMLCanvasElement;

/**
 * Options for `renderAvatarVisualAsciiArt`.
 *
 * @private within the repository
 */
export type RenderAvatarVisualAsciiArtOptions = {
    /**
     * Stable visual identity of the rendered agent avatar.
     */
    readonly avatarDefinition: AvatarDefinition;

    /**
     * Built-in avatar visual to render, the same one used on the website.
     */
    readonly visualId: AvatarVisualId;

    /**
     * Output width in terminal character cells.
     *
     * @default `DEFAULT_AVATAR_ASCII_ART_COLUMNS`
     */
    readonly columns?: number;

    /**
     * Output height in terminal character cells.
     *
     * @default `columns / 2` so the square avatar stays visually square in a common terminal font
     */
    readonly rows?: number;

    /**
     * Color depth of the emitted ANSI escape codes.
     *
     * @default 'TRUE_COLOR'
     */
    readonly colorDepth?: AsciiArtColorDepth;

    /**
     * Animation timestamp for animated visuals.
     *
     * @default `STATIC_AVATAR_ASCII_ART_FRAME_TIME_MS`
     */
    readonly timeMs?: number;

    /**
     * Platform-specific canvas factory used to rasterize the visual.
     */
    readonly createCanvas: CreateCanvasForAsciiArt;
};

/**
 * Renders one built-in avatar visual into ANSI-colored ASCII art for terminal display.
 *
 * This is the universal bridge between the canvas avatar visuals shown on the website and
 * text-based terminal UIs: the visual is rasterized through the exact same `renderAvatarVisual`
 * pipeline the web uses, then the resulting pixels are converted into colored half-block
 * characters by `convertImageDataToAsciiArt`.
 *
 * @param options Avatar identity, visual selection, output grid size, and the platform canvas factory.
 * @returns One ANSI-colored string per output row.
 *
 * @private within the repository
 */
export function renderAvatarVisualAsciiArt(options: RenderAvatarVisualAsciiArtOptions): ReadonlyArray<string> {
    const columns = options.columns ?? DEFAULT_AVATAR_ASCII_ART_COLUMNS;
    const rows = options.rows ?? Math.round(columns / 2);

    const canvas = options.createCanvas(DEFAULT_AVATAR_SIZE, DEFAULT_AVATAR_SIZE);

    if (!canvas.style) {
        // Note: `renderAvatarVisual` expects a browser canvas shape; Node.js canvases only need this tiny compatibility shim.
        (canvas as { style: HTMLCanvasElement['style'] }).style = {} as HTMLCanvasElement['style'];
    }

    renderAvatarVisual({
        canvas,
        avatarDefinition: options.avatarDefinition,
        visualId: options.visualId,
        size: DEFAULT_AVATAR_SIZE,
        timeMs: options.timeMs ?? STATIC_AVATAR_ASCII_ART_FRAME_TIME_MS,
        devicePixelRatio: 1,
    });

    const context = canvas.getContext('2d');

    if (!context) {
        throw new EnvironmentMismatchError(
            spaceTrim(`
                2D canvas rendering context is unavailable while converting the avatar visual to ASCII art.

                Provide a \`createCanvas\` factory whose canvases support \`getContext('2d')\`,
                for example \`createCanvas\` of \`@napi-rs/canvas\` in Node.js.
            `),
        );
    }

    const imageData = context.getImageData(0, 0, DEFAULT_AVATAR_SIZE, DEFAULT_AVATAR_SIZE);

    return convertImageDataToAsciiArt({
        imageData,
        columns,
        rows,
        colorDepth: options.colorDepth,
    });
}
