import { spaceTrim } from 'spacetrim';
import { UnexpectedError } from '../../errors/UnexpectedError';

/**
 * Color depth of the ANSI escape codes emitted by the ASCII-art conversion.
 *
 * - `TRUE_COLOR` emits 24-bit `38;2;r;g;b` / `48;2;r;g;b` sequences
 * - `ANSI_256` approximates colors on the 256-color ANSI cube for older terminals
 *
 * @private within the repository
 */
export type AsciiArtColorDepth = 'TRUE_COLOR' | 'ANSI_256';

/**
 * Minimal structural subset of the DOM `ImageData` accepted by the ASCII-art conversion.
 *
 * Works with browser canvas `ImageData`, `@napi-rs/canvas` image data, or any raw RGBA buffer.
 *
 * @private within the repository
 */
export type AsciiArtImageData = {
    /**
     * Source image width in pixels.
     */
    readonly width: number;

    /**
     * Source image height in pixels.
     */
    readonly height: number;

    /**
     * Flat RGBA pixel buffer with 4 bytes per pixel.
     */
    readonly data: ArrayLike<number>;
};

/**
 * Options for `convertImageDataToAsciiArt`.
 *
 * @private within the repository
 */
export type ConvertImageDataToAsciiArtOptions = {
    /**
     * Source pixels to convert.
     */
    readonly imageData: AsciiArtImageData;

    /**
     * Output width in terminal character cells.
     */
    readonly columns: number;

    /**
     * Output height in terminal character cells.
     *
     * Each character cell renders two vertically stacked pixels, so `rows = columns / 2`
     * keeps a square image visually square in a common terminal font.
     */
    readonly rows: number;

    /**
     * Color depth of the emitted ANSI escape codes.
     *
     * @default 'TRUE_COLOR'
     */
    readonly colorDepth?: AsciiArtColorDepth;

    /**
     * Alpha channel value (0-255) below which an averaged half-cell is treated as fully transparent.
     *
     * @default 32
     */
    readonly alphaThreshold?: number;
};

/**
 * Default alpha channel value below which a half-cell is rendered as terminal background.
 *
 * @private within the repository
 */
const DEFAULT_ALPHA_THRESHOLD = 32;

/**
 * Number of channels per pixel in an RGBA buffer.
 *
 * @private within the repository
 */
const RGBA_CHANNEL_COUNT = 4;

/**
 * Upper half block character - foreground paints the top pixel, background paints the bottom pixel.
 *
 * @private within the repository
 */
const UPPER_HALF_BLOCK = '▀'; // <- ▀

/**
 * Lower half block character - foreground paints the bottom pixel while the top pixel stays transparent.
 *
 * @private within the repository
 */
const LOWER_HALF_BLOCK = '▄'; // <- ▄

/**
 * ANSI escape sequence that resets all colors and attributes.
 *
 * @private within the repository
 */
const ANSI_RESET = '\u001b[0m';

/**
 * Maximum spread between RGB channels for a color to be treated as (nearly) achromatic gray.
 *
 * @private within the repository
 */
const ANSI_256_ACHROMATIC_CHANNEL_SPREAD = 12;

/**
 * Gray level above which an achromatic color maps to the pure white color-cube entry.
 *
 * @private within the repository
 */
const ANSI_256_NEAR_WHITE_GRAY_LEVEL = 246;

/**
 * Index of pure white inside the 6×6×6 ANSI color cube.
 *
 * @private within the repository
 */
const ANSI_256_WHITE_INDEX = 231;

/**
 * Brightness of the lightest entry of the ANSI 256 grayscale ramp.
 *
 * @private within the repository
 */
const ANSI_256_GRAYSCALE_RAMP_MAX_LEVEL = 238;

/**
 * Number of grayscale ramp steps above its first entry (ANSI indexes 232-255).
 *
 * @private within the repository
 */
const ANSI_256_GRAYSCALE_RAMP_INDEX_SPAN = 23;

/**
 * Area-averaged color of one half of a character cell.
 *
 * @private helper of `convertImageDataToAsciiArt`
 */
type HalfCellColor = {
    readonly red: number;
    readonly green: number;
    readonly blue: number;
    readonly isOpaque: boolean;
};

/**
 * Converts raw RGBA image pixels into colored ASCII art for ANSI terminals.
 *
 * This is the universal image-to-terminal technique used across the repository:
 * every output character cell covers a rectangular region of source pixels which is
 * split into a top and bottom half; each half is area-averaged and rendered with
 * half-block characters (`▀` / `▄`) so one character shows two "pixels" vertically.
 * Transparent halves keep the terminal background so non-rectangular images
 * (for example rounded avatar cards) compose naturally into any terminal UI.
 *
 * @param options Source pixels, output grid size, and ANSI color depth.
 * @returns One ANSI-colored string per output row, each ending with a color reset.
 *
 * @private within the repository
 */
export function convertImageDataToAsciiArt(options: ConvertImageDataToAsciiArtOptions): ReadonlyArray<string> {
    const { imageData, columns, rows, colorDepth = 'TRUE_COLOR', alphaThreshold = DEFAULT_ALPHA_THRESHOLD } = options;

    if (!Number.isInteger(columns) || columns <= 0 || !Number.isInteger(rows) || rows <= 0) {
        throw new UnexpectedError(
            spaceTrim(`
                ASCII-art grid size is invalid.

                Both \`columns\` and \`rows\` must be positive integers but \`${columns}\` × \`${rows}\` was requested.
            `),
        );
    }

    if (
        imageData.width <= 0 ||
        imageData.height <= 0 ||
        imageData.data.length < imageData.width * imageData.height * RGBA_CHANNEL_COUNT
    ) {
        throw new UnexpectedError(
            spaceTrim(`
                ASCII-art source image data is invalid.

                Expected a RGBA buffer of at least \`${imageData.width} × ${imageData.height} × ${RGBA_CHANNEL_COUNT}\` bytes
                but got \`${imageData.data.length}\` bytes.
            `),
        );
    }

    const halfCellRowCount = rows * 2;
    const asciiArtLines: Array<string> = [];

    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
        let line = '';
        let currentForegroundCode: string | undefined = undefined;
        let currentBackgroundCode: string | undefined = undefined;

        for (let columnIndex = 0; columnIndex < columns; columnIndex++) {
            const topHalfColor = computeHalfCellColor(
                imageData,
                columnIndex,
                rowIndex * 2,
                columns,
                halfCellRowCount,
                alphaThreshold,
            );
            const bottomHalfColor = computeHalfCellColor(
                imageData,
                columnIndex,
                rowIndex * 2 + 1,
                columns,
                halfCellRowCount,
                alphaThreshold,
            );

            let character: string;
            let nextForegroundCode: string | undefined;
            let nextBackgroundCode: string | undefined;

            if (topHalfColor.isOpaque && bottomHalfColor.isOpaque) {
                character = UPPER_HALF_BLOCK;
                nextForegroundCode = createForegroundColorCode(topHalfColor, colorDepth);
                nextBackgroundCode = createBackgroundColorCode(bottomHalfColor, colorDepth);
            } else if (topHalfColor.isOpaque) {
                character = UPPER_HALF_BLOCK;
                nextForegroundCode = createForegroundColorCode(topHalfColor, colorDepth);
                nextBackgroundCode = undefined;
            } else if (bottomHalfColor.isOpaque) {
                character = LOWER_HALF_BLOCK;
                nextForegroundCode = createForegroundColorCode(bottomHalfColor, colorDepth);
                nextBackgroundCode = undefined;
            } else {
                character = ' ';
                nextForegroundCode = undefined;
                nextBackgroundCode = undefined;
            }

            if (nextForegroundCode !== currentForegroundCode || nextBackgroundCode !== currentBackgroundCode) {
                // Note: A reset is required whenever a previously set color must be cleared,
                //       otherwise stale background color would bleed into transparent cells.
                const isResetNeeded =
                    (currentForegroundCode !== undefined && nextForegroundCode === undefined) ||
                    (currentBackgroundCode !== undefined && nextBackgroundCode === undefined);

                if (isResetNeeded) {
                    line += ANSI_RESET;
                    currentForegroundCode = undefined;
                    currentBackgroundCode = undefined;
                }

                if (nextForegroundCode !== undefined && nextForegroundCode !== currentForegroundCode) {
                    line += nextForegroundCode;
                }

                if (nextBackgroundCode !== undefined && nextBackgroundCode !== currentBackgroundCode) {
                    line += nextBackgroundCode;
                }

                currentForegroundCode = nextForegroundCode;
                currentBackgroundCode = nextBackgroundCode;
            }

            line += character;
        }

        if (currentForegroundCode !== undefined || currentBackgroundCode !== undefined) {
            line += ANSI_RESET;
        }

        asciiArtLines.push(line);
    }

    return asciiArtLines;
}

/**
 * Computes the area-averaged color of one half-cell of the output grid.
 *
 * Color channels are alpha-weighted so semi-transparent edge pixels do not darken towards black.
 *
 * @private helper of `convertImageDataToAsciiArt`
 */
function computeHalfCellColor(
    imageData: AsciiArtImageData,
    columnIndex: number,
    halfCellRowIndex: number,
    columns: number,
    halfCellRowCount: number,
    alphaThreshold: number,
): HalfCellColor {
    const startX = Math.floor((columnIndex * imageData.width) / columns);
    const endX = Math.max(startX + 1, Math.floor(((columnIndex + 1) * imageData.width) / columns));
    const startY = Math.floor((halfCellRowIndex * imageData.height) / halfCellRowCount);
    const endY = Math.max(startY + 1, Math.floor(((halfCellRowIndex + 1) * imageData.height) / halfCellRowCount));

    let redSum = 0;
    let greenSum = 0;
    let blueSum = 0;
    let alphaSum = 0;
    let sampledPixelCount = 0;

    for (let y = startY; y < endY && y < imageData.height; y++) {
        for (let x = startX; x < endX && x < imageData.width; x++) {
            const pixelOffset = (y * imageData.width + x) * RGBA_CHANNEL_COUNT;
            const alpha = imageData.data[pixelOffset + 3]!;

            redSum += imageData.data[pixelOffset]! * alpha;
            greenSum += imageData.data[pixelOffset + 1]! * alpha;
            blueSum += imageData.data[pixelOffset + 2]! * alpha;
            alphaSum += alpha;
            sampledPixelCount++;
        }
    }

    const averageAlpha = sampledPixelCount === 0 ? 0 : alphaSum / sampledPixelCount;

    if (averageAlpha < alphaThreshold || alphaSum === 0) {
        return { red: 0, green: 0, blue: 0, isOpaque: false };
    }

    return {
        red: Math.round(redSum / alphaSum),
        green: Math.round(greenSum / alphaSum),
        blue: Math.round(blueSum / alphaSum),
        isOpaque: true,
    };
}

/**
 * Creates the ANSI escape code that sets the foreground color of following characters.
 *
 * @private helper of `convertImageDataToAsciiArt`
 */
function createForegroundColorCode(color: HalfCellColor, colorDepth: AsciiArtColorDepth): string {
    if (colorDepth === 'TRUE_COLOR') {
        return `\u001b[38;2;${color.red};${color.green};${color.blue}m`;
    }

    return `\u001b[38;5;${mapColorToAnsi256(color)}m`;
}

/**
 * Creates the ANSI escape code that sets the background color of following characters.
 *
 * @private helper of `convertImageDataToAsciiArt`
 */
function createBackgroundColorCode(color: HalfCellColor, colorDepth: AsciiArtColorDepth): string {
    if (colorDepth === 'TRUE_COLOR') {
        return `\u001b[48;2;${color.red};${color.green};${color.blue}m`;
    }

    return `\u001b[48;5;${mapColorToAnsi256(color)}m`;
}

/**
 * Maps a 24-bit color onto the closest entry of the 256-color ANSI palette.
 *
 * Uses the 6×6×6 color cube (entries 16-231) and the grayscale ramp (entries 232-255).
 *
 * @private helper of `convertImageDataToAsciiArt`
 */
function mapColorToAnsi256(color: HalfCellColor): number {
    const { red, green, blue } = color;

    // Note: Prefer the finer grayscale ramp when the color is (nearly) achromatic
    const maxChannel = Math.max(red, green, blue);
    const minChannel = Math.min(red, green, blue);
    if (maxChannel - minChannel < ANSI_256_ACHROMATIC_CHANNEL_SPREAD) {
        const gray = Math.round((red + green + blue) / 3);
        if (gray < 4) {
            return 16; // <- Note: Pure black lives in the color cube
        }
        if (gray > ANSI_256_NEAR_WHITE_GRAY_LEVEL) {
            return ANSI_256_WHITE_INDEX; // <- Note: Pure white lives in the color cube
        }
        return 232 + Math.round(((gray - 8) / ANSI_256_GRAYSCALE_RAMP_MAX_LEVEL) * ANSI_256_GRAYSCALE_RAMP_INDEX_SPAN);
    }

    const redIndex = Math.round((red / 255) * 5);
    const greenIndex = Math.round((green / 255) * 5);
    const blueIndex = Math.round((blue / 255) * 5);

    return 16 + 36 * redIndex + 6 * greenIndex + blueIndex;
}
