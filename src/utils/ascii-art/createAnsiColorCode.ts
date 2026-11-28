import type { AsciiArtColorDepth } from './convertImageDataToAsciiArt';

// Note: [💞] Ignore a discrepancy between file name and entity name

/**
 * ANSI escape sequence that resets all colors and attributes.
 *
 * @private within the repository
 */
export const ANSI_RESET = '\u001b[0m';

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
 * One opaque 24-bit color which should be written into an ANSI escape sequence.
 *
 * @private within the repository
 */
export type AnsiRgbColor = {
    /**
     * Red channel in the range `[0, 255]`.
     */
    readonly red: number;

    /**
     * Green channel in the range `[0, 255]`.
     */
    readonly green: number;

    /**
     * Blue channel in the range `[0, 255]`.
     */
    readonly blue: number;
};

/**
 * Creates the ANSI escape code that sets the foreground color of following characters.
 *
 * @param color Color painted onto the characters.
 * @param colorDepth Color depth supported by the target terminal.
 * @returns ANSI escape sequence.
 *
 * @private within the repository
 */
export function createAnsiForegroundColorCode(color: AnsiRgbColor, colorDepth: AsciiArtColorDepth): string {
    if (colorDepth === 'TRUE_COLOR') {
        return `\u001b[38;2;${color.red};${color.green};${color.blue}m`;
    }

    return `\u001b[38;5;${mapColorToAnsi256(color)}m`;
}

/**
 * Creates the ANSI escape code that sets the background color of following characters.
 *
 * @param color Color painted behind the characters.
 * @param colorDepth Color depth supported by the target terminal.
 * @returns ANSI escape sequence.
 *
 * @private within the repository
 */
export function createAnsiBackgroundColorCode(color: AnsiRgbColor, colorDepth: AsciiArtColorDepth): string {
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
 * @private helper of `createAnsiForegroundColorCode` and `createAnsiBackgroundColorCode`
 */
function mapColorToAnsi256(color: AnsiRgbColor): number {
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
