import { spaceTrim } from 'spacetrim';
import { EnvironmentMismatchError } from '../errors/EnvironmentMismatchError';
import { UnexpectedError } from '../errors/UnexpectedError';
import type { AsciiArtColorDepth, AsciiArtImageData } from '../utils/ascii-art/convertImageDataToAsciiArt';
import { convertImageDataToAsciiArt } from '../utils/ascii-art/convertImageDataToAsciiArt';
import { DEFAULT_AVATAR_SIZE } from './avatarRenderingUtils';
import type { ResolvedAvatarRenderDefinition } from './renderAvatarVisual';
import { renderAvatarVisual } from './renderAvatarVisual';
import type { AvatarDefinition } from './types/AvatarDefinition';
import type { AvatarSurfaceStyle, AvatarVisualId } from './types/AvatarVisualDefinition';

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
 * Default source canvas width used before the pixels are converted to ASCII art.
 *
 * @private within the repository
 */
const DEFAULT_AVATAR_ASCII_ART_CANVAS_WIDTH = DEFAULT_AVATAR_SIZE;

/**
 * Default source canvas height used before the pixels are converted to ASCII art.
 *
 * @private within the repository
 */
const DEFAULT_AVATAR_ASCII_ART_CANVAS_HEIGHT = DEFAULT_AVATAR_SIZE;

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
     * Surface used to composite the avatar before ASCII conversion.
     *
     * @default 'framed'
     */
    readonly surface?: AvatarSurfaceStyle;

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
     * Source canvas width in CSS pixels before ASCII conversion.
     *
     * @default `DEFAULT_AVATAR_SIZE`
     */
    readonly canvasWidth?: number;

    /**
     * Source canvas height in CSS pixels before ASCII conversion.
     *
     * @default `DEFAULT_AVATAR_SIZE`
     */
    readonly canvasHeight?: number;

    /**
     * Optional stable render data reused across frames.
     */
    readonly resolvedAvatarRenderDefinition?: ResolvedAvatarRenderDefinition;

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
    const canvasWidth = options.canvasWidth ?? DEFAULT_AVATAR_ASCII_ART_CANVAS_WIDTH;
    const canvasHeight = options.canvasHeight ?? DEFAULT_AVATAR_ASCII_ART_CANVAS_HEIGHT;
    assertPositiveCanvasDimension(canvasWidth, 'canvasWidth');
    assertPositiveCanvasDimension(canvasHeight, 'canvasHeight');

    const imageData = renderAvatarVisualAsciiArtImageData(options, canvasWidth, canvasHeight);

    return convertImageDataToAsciiArt({
        imageData,
        columns,
        rows,
        colorDepth: options.colorDepth,
    });
}

/**
 * Renders one avatar visual frame into source pixels ready for ASCII conversion.
 *
 * @private helper of `renderAvatarVisualAsciiArt`
 */
function renderAvatarVisualAsciiArtImageData(
    options: RenderAvatarVisualAsciiArtOptions,
    canvasWidth: number,
    canvasHeight: number,
): AsciiArtImageData {
    const avatarSize = Math.min(canvasWidth, canvasHeight);
    const avatarCanvas = createCanvasWithBrowserShape(options.createCanvas, avatarSize, avatarSize);

    renderAvatarVisual(
        {
            canvas: avatarCanvas,
            avatarDefinition: options.avatarDefinition,
            visualId: options.visualId,
            surface: options.surface,
            size: avatarSize,
            timeMs: options.timeMs ?? STATIC_AVATAR_ASCII_ART_FRAME_TIME_MS,
            devicePixelRatio: 1,
        },
        options.resolvedAvatarRenderDefinition,
    );

    if (canvasWidth === avatarSize && canvasHeight === avatarSize) {
        return getCanvas2dContext(avatarCanvas).getImageData(0, 0, avatarSize, avatarSize);
    }

    const canvas = createCanvasWithBrowserShape(options.createCanvas, canvasWidth, canvasHeight);
    const context = getCanvas2dContext(canvas);
    const avatarLeft = (canvasWidth - avatarSize) / 2;
    const avatarTop = (canvasHeight - avatarSize) / 2;

    context.clearRect(0, 0, canvasWidth, canvasHeight);
    context.drawImage(avatarCanvas, avatarLeft, avatarTop, avatarSize, avatarSize);

    return context.getImageData(0, 0, canvasWidth, canvasHeight);
}

/**
 * Creates a canvas and adds the small browser-shape compatibility shim expected by avatar rendering.
 *
 * @private helper of `renderAvatarVisualAsciiArt`
 */
function createCanvasWithBrowserShape(
    createCanvas: CreateCanvasForAsciiArt,
    width: number,
    height: number,
): HTMLCanvasElement {
    const canvas = createCanvas(width, height);

    if (!canvas.style) {
        // Note: `renderAvatarVisual` expects a browser canvas shape; Node.js canvases only need this tiny compatibility shim.
        (canvas as { style: HTMLCanvasElement['style'] }).style = {} as HTMLCanvasElement['style'];
    }

    return canvas;
}

/**
 * Reads a 2D rendering context or throws a branded environment error.
 *
 * @private helper of `renderAvatarVisualAsciiArt`
 */
function getCanvas2dContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
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

    return context;
}

/**
 * Validates one source canvas dimension.
 *
 * @private helper of `renderAvatarVisualAsciiArt`
 */
function assertPositiveCanvasDimension(value: number, dimensionName: 'canvasWidth' | 'canvasHeight'): void {
    if (Number.isInteger(value) && value > 0) {
        return;
    }

    throw new UnexpectedError(
        spaceTrim(`
            Avatar ASCII-art source canvas dimension is invalid.

            \`${dimensionName}\` must be a positive integer but \`${value}\` was requested.
        `),
    );
}
