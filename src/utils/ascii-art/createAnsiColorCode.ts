/**
 * Color depth of the ANSI escape codes emitted by the terminal renderers.
 *
 * - `TRUE_COLOR` emits 24-bit `38;2;r;g;b` / `48;2;r;g;b` sequences
 * - `ANSI_256` approximates colors on the 256-color ANSI cube for older terminals
 *
 * @private within the repository
 */
export type AsciiArtColorDepth = 'TRUE_COLOR' | 'ANSI_256';

/**
 * Opaque 24-bit color painted by one ANSI escape code.
 *
 * @private within the repository
 */
export type AnsiColor = {
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
 * Terminal layer painted by one ANSI color escape code.
 *
 * @private within the repository
 */
export type AnsiColorLayer = 'foreground' | 'background';

/**
 * ANSI escape sequence that resets all colors and attributes.
 *
 * @private within the repository
 */
export const ANSI_RESET = '\u001b[0m';

/**
 * Maximum spread between RGB channels for a color to be treated as (nearly) achromatic gray.
 *
 * @private helper of `createAnsiColorCode`
 */
const ANSI_256_ACHROMATIC_CHANNEL_SPREAD = 12;

/**
 * Gray level above which an achromatic color maps to the pure white color-cube entry.
 *
 * @private helper of `createAnsiColorCode`
 */
const ANSI_256_NEAR_WHITE_GRAY_LEVEL = 246;

/**
 * Index of pure white inside the 6×6×6 ANSI color cube.
 *
 * @private helper of `createAnsiColorCode`
 */
const ANSI_256_WHITE_INDEX = 231;

/**
 * Brightness of the lightest entry of the ANSI 256 grayscale ramp.
 *
 * @private helper of `createAnsiColorCode`
 */
const ANSI_256_GRAYSCALE_RAMP_MAX_LEVEL = 238;

/**
 * Number of grayscale ramp steps above its first entry (ANSI indexes 232-255).
 *
 * @private helper of `createAnsiColorCode`
 */
const ANSI_256_GRAYSCALE_RAMP_INDEX_SPAN = 23;

/**
 * Creates the ANSI escape code that paints one terminal layer with the given color.
 *
 * This is the single place where colors become terminal escape sequences, so every
 * terminal renderer in the repository (image-to-ASCII conversion, text avatar visuals, ...)
 * emits the exact same sequences for the same color and color depth.
 *
 * @param color Opaque 24-bit color to paint.
 * @param layer Terminal layer painted by the escape code.
 * @param colorDepth Color depth supported by the target terminal.
 * @returns ANSI escape sequence.
 *
 * @private within the repository
 */
export function createAnsiColorCode(color: AnsiColor, layer: AnsiColorLayer, colorDepth: AsciiArtColorDepth): string {
    const layerCode = layer === 'foreground' ? 38 : 48;

    if (colorDepth === 'TRUE_COLOR') {
        return `\u001b[${layerCode};2;${color.red};${color.green};${color.blue}m`;
    }

    return `\u001b[${layerCode};5;${mapColorToAnsi256(color)}m`;
}

/**
 * Maps a 24-bit color onto the closest entry of the 256-color ANSI palette.
 *
 * Uses the 6×6×6 color cube (entries 16-231) and the grayscale ramp (entries 232-255).
 *
 * @private helper of `createAnsiColorCode`
 */
function mapColorToAnsi256(color: AnsiColor): number {
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
