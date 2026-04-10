import { computeHash } from '@promptbook-local/utils';
import {
    type AgentDefaultAvatarParameters,
    AgentDefaultAvatarParametersSchema,
    serializeAgentDefaultAvatarParameters,
} from './AgentDefaultAvatarParameters';

/**
 * One 16x16 pixel-art matrix.
 */
type PixelMatrix = string[][];

/**
 * One deterministic palette used for background, body, and facial details.
 */
type AvatarPalette = {
    background: string;
    backgroundDetail: string;
    highlight: string;
    skin: string;
    outfit: string;
    accent: string;
    outline: string;
    face: string;
    blush: string;
};

/**
 * Width/height of the procedural pixel-art matrix.
 */
const MATRIX_SIZE = 16;

/**
 * Fixed logical output size exposed by the SVG avatar.
 */
const OUTPUT_SIZE = 256;

/**
 * Deterministic background patterns keyed by `backgroundSeed`.
 */
const BACKGROUND_PATTERN_KEYS = ['dots', 'grid', 'chevrons', 'stairs', 'rays'] as const;

/**
 * Deterministic head/body silhouettes keyed by `silhouetteSeed`.
 */
const SILHOUETTE_KEYS = ['round', 'square', 'hex', 'cloak'] as const;

/**
 * Ordered deterministic palettes keyed by `paletteSeed`.
 */
const AVATAR_PALETTES: readonly AvatarPalette[] = [
    {
        background: '#f7e2c6',
        backgroundDetail: '#e8bd6d',
        highlight: '#fff4df',
        skin: '#f0c59b',
        outfit: '#485c9c',
        accent: '#ff8a65',
        outline: '#2d2019',
        face: '#2d2019',
        blush: '#f6a5a5',
    },
    {
        background: '#d8f1ff',
        backgroundDetail: '#8dcaef',
        highlight: '#f5fbff',
        skin: '#f3cfac',
        outfit: '#2a6f97',
        accent: '#1fb5a9',
        outline: '#19334b',
        face: '#19334b',
        blush: '#f2a7a1',
    },
    {
        background: '#e4f7dd',
        backgroundDetail: '#92ca8d',
        highlight: '#f4fff0',
        skin: '#e9c69a',
        outfit: '#2f6f53',
        accent: '#f2c14e',
        outline: '#213329',
        face: '#213329',
        blush: '#edaaa0',
    },
    {
        background: '#ece2ff',
        backgroundDetail: '#b49ae6',
        highlight: '#faf5ff',
        skin: '#f0cab1',
        outfit: '#5b4b8a',
        accent: '#ff7aa2',
        outline: '#2b223f',
        face: '#2b223f',
        blush: '#f4a3bf',
    },
    {
        background: '#ffe7d2',
        backgroundDetail: '#f8b36a',
        highlight: '#fff7ef',
        skin: '#f1c295',
        outfit: '#9f4d3f',
        accent: '#ffcc66',
        outline: '#41251d',
        face: '#41251d',
        blush: '#f2a290',
    },
    {
        background: '#dfe6f4',
        backgroundDetail: '#9aa8c7',
        highlight: '#f6f8ff',
        skin: '#e8c09c',
        outfit: '#394867',
        accent: '#87a8d0',
        outline: '#1f2837',
        face: '#1f2837',
        blush: '#dfa3a3',
    },
    {
        background: '#ffe0ee',
        backgroundDetail: '#ef9ec2',
        highlight: '#fff5fa',
        skin: '#f2c7aa',
        outfit: '#8e3b67',
        accent: '#f7c15a',
        outline: '#3d2030',
        face: '#3d2030',
        blush: '#f29ab2',
    },
    {
        background: '#dce9db',
        backgroundDetail: '#91b586',
        highlight: '#f3f9f0',
        skin: '#e5bd96',
        outfit: '#486b4a',
        accent: '#d98e43',
        outline: '#243425',
        face: '#243425',
        blush: '#df9b92',
    },
] as const;

/**
 * Renders one deterministic procedural pixel-art avatar as SVG bytes.
 *
 * @param rawParameters - Stored deterministic parameters for the avatar.
 * @returns Stable SVG markup for the avatar.
 */
export function renderAgentDefaultAvatarSvg(rawParameters: AgentDefaultAvatarParameters): string {
    const parameters = AgentDefaultAvatarParametersSchema.parse(rawParameters);
    const palette = AVATAR_PALETTES[parameters.paletteSeed]!;
    const renderHash = computeHash(serializeAgentDefaultAvatarParameters(parameters));
    const matrix = createPixelMatrix(palette.background);

    drawBackgroundPattern(matrix, parameters, palette, renderHash);
    drawHighlightShape(matrix, parameters, palette, renderHash);
    drawBody(matrix, parameters, palette);
    drawHead(matrix, parameters, palette);
    drawFace(matrix, parameters, palette);
    drawAccessory(matrix, parameters, palette, renderHash);
    drawChestEmblem(matrix, parameters, palette, renderHash);

    const rectangles: string[] = [];
    for (let y = 0; y < MATRIX_SIZE; y++) {
        for (let x = 0; x < MATRIX_SIZE; x++) {
            rectangles.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${matrix[y]![x]!}"/>`);
        }
    }

    return [
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MATRIX_SIZE} ${MATRIX_SIZE}" width="${OUTPUT_SIZE}" height="${OUTPUT_SIZE}" shape-rendering="crispEdges" preserveAspectRatio="xMidYMid meet">`,
        `<title>Deterministic agent avatar</title>`,
        ...rectangles,
        `</svg>`,
    ].join('');
}

/**
 * Creates a filled pixel matrix for the avatar.
 *
 * @param fillColor - Initial color for all pixels.
 * @returns Fresh pixel matrix.
 */
function createPixelMatrix(fillColor: string): PixelMatrix {
    return Array.from({ length: MATRIX_SIZE }, () => Array.from({ length: MATRIX_SIZE }, () => fillColor));
}

/**
 * Draws the background pattern layer.
 *
 * @param matrix - Avatar pixel matrix.
 * @param parameters - Stored deterministic parameters.
 * @param palette - Selected deterministic palette.
 * @param renderHash - Stable renderer hash.
 */
function drawBackgroundPattern(
    matrix: PixelMatrix,
    parameters: AgentDefaultAvatarParameters,
    palette: AvatarPalette,
    renderHash: string,
): void {
    const patternKey = BACKGROUND_PATTERN_KEYS[parameters.backgroundSeed]!;
    const offset = readHashNibble(renderHash, 5);

    for (let y = 0; y < MATRIX_SIZE; y++) {
        for (let x = 0; x < MATRIX_SIZE; x++) {
            const isPatternPixel =
                patternKey === 'dots'
                    ? ((x * 3 + y * 5 + offset) % 7 === 0)
                    : patternKey === 'grid'
                      ? x % 4 === 0 || y % 4 === 0
                      : patternKey === 'chevrons'
                        ? (x + offset) % 6 === Math.abs((y % 6) - 3)
                        : patternKey === 'stairs'
                          ? (x + y + offset) % 5 === 0 && x >= 2 && y >= 2
                          : Math.abs(x - 7) === ((y + offset) % 6);

            if (isPatternPixel) {
                setPixel(matrix, x, y, palette.backgroundDetail);
            }
        }
    }
}

/**
 * Draws a soft geometric highlight behind the head.
 *
 * @param matrix - Avatar pixel matrix.
 * @param parameters - Stored deterministic parameters.
 * @param palette - Selected deterministic palette.
 * @param renderHash - Stable renderer hash.
 */
function drawHighlightShape(
    matrix: PixelMatrix,
    parameters: AgentDefaultAvatarParameters,
    palette: AvatarPalette,
    renderHash: string,
): void {
    const highlightKey = readHashNibble(renderHash, parameters.detailSeed) % 4;

    if (highlightKey === 0) {
        fillRect(matrix, 5, 2, 6, 1, palette.highlight);
        fillRect(matrix, 4, 3, 8, 1, palette.highlight);
        fillRect(matrix, 3, 4, 10, 1, palette.highlight);
    } else if (highlightKey === 1) {
        drawPixels(
            matrix,
            [
                [7, 1],
                [8, 1],
                [6, 2],
                [9, 2],
                [5, 3],
                [10, 3],
                [4, 4],
                [11, 4],
            ],
            palette.highlight,
        );
    } else if (highlightKey === 2) {
        fillRect(matrix, 7, 1, 2, 4, palette.highlight);
        fillRect(matrix, 5, 3, 6, 1, palette.highlight);
    } else {
        fillRect(matrix, 4, 2, 1, 5, palette.highlight);
        fillRect(matrix, 11, 2, 1, 5, palette.highlight);
        fillRect(matrix, 5, 4, 6, 1, palette.highlight);
    }
}

/**
 * Draws the shoulders and torso.
 *
 * @param matrix - Avatar pixel matrix.
 * @param parameters - Stored deterministic parameters.
 * @param palette - Selected deterministic palette.
 */
function drawBody(matrix: PixelMatrix, parameters: AgentDefaultAvatarParameters, palette: AvatarPalette): void {
    const isStrict = parameters.strictness === 'high';
    const isSoft = parameters.strictness === 'low';

    fillRect(matrix, 6, 9, 4, 1, palette.skin);
    fillRect(matrix, 5, 10, 6, 4, palette.outfit);
    fillRect(matrix, 6, 10, 4, 4, palette.accent);

    if (isStrict) {
        fillRect(matrix, 4, 10, 1, 4, palette.outfit);
        fillRect(matrix, 11, 10, 1, 4, palette.outfit);
    } else if (isSoft) {
        setPixel(matrix, 4, 11, palette.outfit);
        setPixel(matrix, 11, 11, palette.outfit);
        setPixel(matrix, 4, 12, palette.accent);
        setPixel(matrix, 11, 12, palette.accent);
    } else {
        fillRect(matrix, 4, 11, 1, 3, palette.outfit);
        fillRect(matrix, 11, 11, 1, 3, palette.outfit);
    }
}

/**
 * Draws the head silhouette, outline, and hood/hair layer.
 *
 * @param matrix - Avatar pixel matrix.
 * @param parameters - Stored deterministic parameters.
 * @param palette - Selected deterministic palette.
 */
function drawHead(matrix: PixelMatrix, parameters: AgentDefaultAvatarParameters, palette: AvatarPalette): void {
    const silhouetteKey = SILHOUETTE_KEYS[parameters.silhouetteSeed]!;

    if (silhouetteKey === 'round') {
        fillRect(matrix, 5, 3, 6, 6, palette.outline);
        fillRect(matrix, 6, 2, 4, 1, palette.outline);
        fillRect(matrix, 4, 4, 1, 4, palette.outline);
        fillRect(matrix, 11, 4, 1, 4, palette.outline);
        fillRect(matrix, 6, 3, 4, 6, palette.skin);
        fillRect(matrix, 5, 4, 1, 4, palette.skin);
        fillRect(matrix, 10, 4, 1, 4, palette.skin);
        fillRect(matrix, 5, 3, 6, 2, palette.outfit);
    } else if (silhouetteKey === 'square') {
        fillRect(matrix, 4, 3, 8, 7, palette.outline);
        fillRect(matrix, 5, 4, 6, 5, palette.skin);
        fillRect(matrix, 5, 3, 6, 2, palette.outfit);
    } else if (silhouetteKey === 'hex') {
        fillRect(matrix, 5, 2, 6, 1, palette.outline);
        fillRect(matrix, 4, 3, 8, 6, palette.outline);
        fillRect(matrix, 5, 9, 6, 1, palette.outline);
        fillRect(matrix, 5, 3, 6, 6, palette.skin);
        fillRect(matrix, 4, 4, 1, 4, palette.skin);
        fillRect(matrix, 11, 4, 1, 4, palette.skin);
        fillRect(matrix, 5, 3, 6, 2, palette.outfit);
    } else {
        fillRect(matrix, 5, 2, 6, 1, palette.outline);
        fillRect(matrix, 4, 3, 8, 7, palette.outline);
        fillRect(matrix, 3, 5, 1, 5, palette.outfit);
        fillRect(matrix, 12, 5, 1, 5, palette.outfit);
        fillRect(matrix, 5, 3, 6, 6, palette.skin);
        fillRect(matrix, 4, 4, 1, 4, palette.outfit);
        fillRect(matrix, 11, 4, 1, 4, palette.outfit);
        fillRect(matrix, 5, 3, 6, 2, palette.outfit);
    }
}

/**
 * Draws eyes, brows, mouth, and kindness/strictness facial cues.
 *
 * @param matrix - Avatar pixel matrix.
 * @param parameters - Stored deterministic parameters.
 * @param palette - Selected deterministic palette.
 */
function drawFace(matrix: PixelMatrix, parameters: AgentDefaultAvatarParameters, palette: AvatarPalette): void {
    if (parameters.strictness === 'high') {
        setPixel(matrix, 5, 5, palette.face);
        setPixel(matrix, 6, 5, palette.face);
        setPixel(matrix, 9, 5, palette.face);
        setPixel(matrix, 10, 5, palette.face);
    }

    if (parameters.energy === 'lively') {
        drawPixels(
            matrix,
            [
                [6, 6],
                [9, 6],
                [7, 6],
                [8, 6],
            ],
            palette.face,
        );
    } else {
        drawPixels(
            matrix,
            [
                [6, 6],
                [9, 6],
            ],
            palette.face,
        );
    }

    if (parameters.kindness === 'high') {
        drawPixels(
            matrix,
            [
                [5, 7],
                [10, 7],
            ],
            palette.blush,
        );
        drawPixels(
            matrix,
            [
                [6, 8],
                [7, 9],
                [8, 9],
                [9, 8],
            ],
            palette.face,
        );
    } else if (parameters.kindness === 'low' && parameters.strictness === 'high') {
        drawPixels(
            matrix,
            [
                [6, 9],
                [7, 8],
                [8, 8],
                [9, 9],
            ],
            palette.face,
        );
    } else {
        fillRect(matrix, 6, 8, 4, 1, palette.face);
    }
}

/**
 * Draws one archetype-specific accessory.
 *
 * @param matrix - Avatar pixel matrix.
 * @param parameters - Stored deterministic parameters.
 * @param palette - Selected deterministic palette.
 * @param renderHash - Stable renderer hash.
 */
function drawAccessory(
    matrix: PixelMatrix,
    parameters: AgentDefaultAvatarParameters,
    palette: AvatarPalette,
    renderHash: string,
): void {
    if (parameters.archetype === 'guide') {
        fillRect(matrix, 6, 1, 4, 1, palette.accent);
        setPixel(matrix, 5, 2, palette.accent);
        setPixel(matrix, 10, 2, palette.accent);
    } else if (parameters.archetype === 'builder') {
        fillRect(matrix, 4, 5, 1, 3, palette.accent);
        fillRect(matrix, 11, 5, 1, 3, palette.accent);
        setPixel(matrix, 12, 7, palette.accent);
    } else if (parameters.archetype === 'scholar') {
        fillRect(matrix, 5, 6, 2, 2, palette.accent);
        fillRect(matrix, 9, 6, 2, 2, palette.accent);
        setPixel(matrix, 7, 7, palette.accent);
        setPixel(matrix, 8, 7, palette.accent);
    } else if (parameters.archetype === 'guardian') {
        fillRect(matrix, 5, 5, 6, 2, palette.accent);
    } else if (parameters.archetype === 'creator') {
        const crownOffset = readHashNibble(renderHash, 9) % 2;
        drawPixels(
            matrix,
            [
                [5 + crownOffset, 2],
                [7, 1],
                [9 - crownOffset, 2],
            ],
            palette.accent,
        );
    } else if (parameters.archetype === 'analyst') {
        fillRect(matrix, 5, 6, 2, 2, palette.accent);
        fillRect(matrix, 6, 7, 3, 1, palette.accent);
    } else if (parameters.archetype === 'explorer') {
        fillRect(matrix, 4, 4, 1, 2, palette.accent);
        setPixel(matrix, 4, 3, palette.accent);
        fillRect(matrix, 11, 4, 1, 2, palette.accent);
    } else {
        fillRect(matrix, 4, 5, 1, 3, palette.accent);
        fillRect(matrix, 11, 5, 1, 3, palette.accent);
        fillRect(matrix, 11, 7, 2, 1, palette.accent);
    }
}

/**
 * Draws one small chest emblem so archetypes stay readable at avatar size.
 *
 * @param matrix - Avatar pixel matrix.
 * @param parameters - Stored deterministic parameters.
 * @param palette - Selected deterministic palette.
 * @param renderHash - Stable renderer hash.
 */
function drawChestEmblem(
    matrix: PixelMatrix,
    parameters: AgentDefaultAvatarParameters,
    palette: AvatarPalette,
    renderHash: string,
): void {
    const emblemVariant = (parameters.detailSeed + readHashNibble(renderHash, 13)) % 4;

    if (parameters.archetype === 'guardian' || emblemVariant === 0) {
        drawPixels(
            matrix,
            [
                [7, 11],
                [8, 11],
                [6, 12],
                [9, 12],
                [7, 13],
                [8, 13],
            ],
            palette.highlight,
        );
    } else if (parameters.archetype === 'scholar' || emblemVariant === 1) {
        fillRect(matrix, 6, 11, 4, 2, palette.highlight);
        fillRect(matrix, 7, 12, 2, 2, palette.accent);
    } else if (parameters.archetype === 'builder' || emblemVariant === 2) {
        fillRect(matrix, 7, 11, 2, 3, palette.highlight);
        fillRect(matrix, 6, 12, 4, 1, palette.accent);
    } else {
        drawPixels(
            matrix,
            [
                [7, 11],
                [8, 11],
                [7, 12],
                [8, 12],
                [6, 13],
                [9, 13],
            ],
            palette.highlight,
        );
    }
}

/**
 * Sets one pixel if it is inside the 16x16 matrix.
 *
 * @param matrix - Avatar pixel matrix.
 * @param x - X coordinate.
 * @param y - Y coordinate.
 * @param color - Color to set.
 */
function setPixel(matrix: PixelMatrix, x: number, y: number, color: string): void {
    if (x < 0 || y < 0 || x >= MATRIX_SIZE || y >= MATRIX_SIZE) {
        return;
    }

    matrix[y]![x] = color;
}

/**
 * Fills one rectangle inside the avatar matrix.
 *
 * @param matrix - Avatar pixel matrix.
 * @param x - Left coordinate.
 * @param y - Top coordinate.
 * @param width - Rectangle width.
 * @param height - Rectangle height.
 * @param color - Fill color.
 */
function fillRect(
    matrix: PixelMatrix,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
): void {
    for (let innerY = y; innerY < y + height; innerY++) {
        for (let innerX = x; innerX < x + width; innerX++) {
            setPixel(matrix, innerX, innerY, color);
        }
    }
}

/**
 * Draws an explicit list of pixels.
 *
 * @param matrix - Avatar pixel matrix.
 * @param points - Pixel coordinates.
 * @param color - Color to set.
 */
function drawPixels(matrix: PixelMatrix, points: ReadonlyArray<readonly [number, number]>, color: string): void {
    for (const [x, y] of points) {
        setPixel(matrix, x, y, color);
    }
}

/**
 * Reads one hexadecimal nibble from a stable renderer hash.
 *
 * @param hash - Renderer hash string.
 * @param index - Nibble index.
 * @returns Numeric nibble value from `0` to `15`.
 */
function readHashNibble(hash: string, index: number): number {
    const nibble = hash[index % hash.length] ?? '0';
    const parsedNibble = Number.parseInt(nibble, 16);

    return Number.isNaN(parsedNibble) ? 0 : parsedNibble;
}
