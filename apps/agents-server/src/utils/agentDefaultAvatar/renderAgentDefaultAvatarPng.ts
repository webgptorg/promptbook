import type { AgentDefaultAvatarParameters } from './AgentDefaultAvatarParameters';

/**
 * Logical pixel width of the procedural avatar before upscaling.
 */
const LOGICAL_AVATAR_SIZE = 32;

/**
 * Integer scale factor used to preserve crisp pixel edges in the final PNG.
 */
const OUTPUT_SCALE = 4;

/**
 * PNG file signature shared by all rendered outputs.
 */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * CRC32 lookup table used by the deterministic PNG encoder.
 */
const CRC32_TABLE = new Uint32Array(
    Array.from({ length: 256 }, (_, index) => {
        let value = index;
        for (let shift = 0; shift < 8; shift++) {
            value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
        }
        return value >>> 0;
    }),
);

/**
 * RGBA color used by the software pixel renderer.
 */
type RgbaColor = {
    red: number;
    green: number;
    blue: number;
    alpha: number;
};

/**
 * Small in-memory pixel canvas used by the deterministic renderer.
 */
type PixelCanvas = {
    width: number;
    height: number;
    pixels: Uint8Array;
};

/**
 * Palette resolved from one semantic `paletteFamily`.
 */
type AvatarPalette = {
    background: RgbaColor;
    backgroundDetail: RgbaColor;
    face: RgbaColor;
    faceShadow: RgbaColor;
    outline: RgbaColor;
    clothing: RgbaColor;
    clothingShadow: RgbaColor;
    accent: RgbaColor;
    eye: RgbaColor;
    eyeHighlight: RgbaColor;
};

/**
 * Built-in palette families used by the renderer.
 */
const AVATAR_PALETTES: Record<AgentDefaultAvatarParameters['paletteFamily'], ReadonlyArray<AvatarPalette>> = {
    sunrise: [
        {
            background: hexToRgbaColor('#f2d7ae'),
            backgroundDetail: hexToRgbaColor('#dd9b5c'),
            face: hexToRgbaColor('#f6e7cb'),
            faceShadow: hexToRgbaColor('#d6bd91'),
            outline: hexToRgbaColor('#5b3428'),
            clothing: hexToRgbaColor('#8c4c4b'),
            clothingShadow: hexToRgbaColor('#613334'),
            accent: hexToRgbaColor('#f4c95d'),
            eye: hexToRgbaColor('#392019'),
            eyeHighlight: hexToRgbaColor('#fff4db'),
        },
        {
            background: hexToRgbaColor('#f7d3c2'),
            backgroundDetail: hexToRgbaColor('#dd8357'),
            face: hexToRgbaColor('#f9e8d6'),
            faceShadow: hexToRgbaColor('#dbbba1'),
            outline: hexToRgbaColor('#58342b'),
            clothing: hexToRgbaColor('#9b5b4f'),
            clothingShadow: hexToRgbaColor('#693d36'),
            accent: hexToRgbaColor('#ffd56a'),
            eye: hexToRgbaColor('#3f241d'),
            eyeHighlight: hexToRgbaColor('#fff7e5'),
        },
    ],
    forest: [
        {
            background: hexToRgbaColor('#b8d1b2'),
            backgroundDetail: hexToRgbaColor('#5d8a67'),
            face: hexToRgbaColor('#f0e5c9'),
            faceShadow: hexToRgbaColor('#cbb890'),
            outline: hexToRgbaColor('#26382c'),
            clothing: hexToRgbaColor('#3f6251'),
            clothingShadow: hexToRgbaColor('#2b4638'),
            accent: hexToRgbaColor('#c7df7f'),
            eye: hexToRgbaColor('#1f2921'),
            eyeHighlight: hexToRgbaColor('#eef9e5'),
        },
        {
            background: hexToRgbaColor('#cad8af'),
            backgroundDetail: hexToRgbaColor('#6e8e4f'),
            face: hexToRgbaColor('#efe0c7'),
            faceShadow: hexToRgbaColor('#cab490'),
            outline: hexToRgbaColor('#2a3529'),
            clothing: hexToRgbaColor('#53734a'),
            clothingShadow: hexToRgbaColor('#385139'),
            accent: hexToRgbaColor('#a7d679'),
            eye: hexToRgbaColor('#223022'),
            eyeHighlight: hexToRgbaColor('#f4fde8'),
        },
    ],
    ocean: [
        {
            background: hexToRgbaColor('#b8d8e8'),
            backgroundDetail: hexToRgbaColor('#4c8bad'),
            face: hexToRgbaColor('#f1e7d2'),
            faceShadow: hexToRgbaColor('#cfbda0'),
            outline: hexToRgbaColor('#203745'),
            clothing: hexToRgbaColor('#386783'),
            clothingShadow: hexToRgbaColor('#27495c'),
            accent: hexToRgbaColor('#7dd4f0'),
            eye: hexToRgbaColor('#17303d'),
            eyeHighlight: hexToRgbaColor('#edfaff'),
        },
        {
            background: hexToRgbaColor('#c9dff1'),
            backgroundDetail: hexToRgbaColor('#5c95b6'),
            face: hexToRgbaColor('#f5ead8'),
            faceShadow: hexToRgbaColor('#d4c1a3'),
            outline: hexToRgbaColor('#233847'),
            clothing: hexToRgbaColor('#46769a'),
            clothingShadow: hexToRgbaColor('#305067'),
            accent: hexToRgbaColor('#8be7ff'),
            eye: hexToRgbaColor('#183040'),
            eyeHighlight: hexToRgbaColor('#f4fdff'),
        },
    ],
    ember: [
        {
            background: hexToRgbaColor('#e5bf93'),
            backgroundDetail: hexToRgbaColor('#c5643c'),
            face: hexToRgbaColor('#f3dfc4'),
            faceShadow: hexToRgbaColor('#cfb28e'),
            outline: hexToRgbaColor('#4a2a24'),
            clothing: hexToRgbaColor('#7f3d34'),
            clothingShadow: hexToRgbaColor('#592a25'),
            accent: hexToRgbaColor('#ffb454'),
            eye: hexToRgbaColor('#341d1a'),
            eyeHighlight: hexToRgbaColor('#fff1d4'),
        },
        {
            background: hexToRgbaColor('#efc8a7'),
            backgroundDetail: hexToRgbaColor('#d67047'),
            face: hexToRgbaColor('#f8e4cb'),
            faceShadow: hexToRgbaColor('#d3b08e'),
            outline: hexToRgbaColor('#4e2d27'),
            clothing: hexToRgbaColor('#944035'),
            clothingShadow: hexToRgbaColor('#662c25'),
            accent: hexToRgbaColor('#ffd16d'),
            eye: hexToRgbaColor('#36201d'),
            eyeHighlight: hexToRgbaColor('#fff5dd'),
        },
    ],
    slate: [
        {
            background: hexToRgbaColor('#c2cad7'),
            backgroundDetail: hexToRgbaColor('#73839f'),
            face: hexToRgbaColor('#eee4d1'),
            faceShadow: hexToRgbaColor('#cbb89a'),
            outline: hexToRgbaColor('#233040'),
            clothing: hexToRgbaColor('#4c5871'),
            clothingShadow: hexToRgbaColor('#333d50'),
            accent: hexToRgbaColor('#b8c7ff'),
            eye: hexToRgbaColor('#18222f'),
            eyeHighlight: hexToRgbaColor('#f3f8ff'),
        },
        {
            background: hexToRgbaColor('#d5dce7'),
            backgroundDetail: hexToRgbaColor('#7c8ca8'),
            face: hexToRgbaColor('#f4ead7'),
            faceShadow: hexToRgbaColor('#d1bea0'),
            outline: hexToRgbaColor('#273342'),
            clothing: hexToRgbaColor('#58667d'),
            clothingShadow: hexToRgbaColor('#3b4559'),
            accent: hexToRgbaColor('#d0ddff'),
            eye: hexToRgbaColor('#1a2634'),
            eyeHighlight: hexToRgbaColor('#f7fbff'),
        },
    ],
    orchid: [
        {
            background: hexToRgbaColor('#decbe6'),
            backgroundDetail: hexToRgbaColor('#9d74b4'),
            face: hexToRgbaColor('#f5e4d0'),
            faceShadow: hexToRgbaColor('#d4b89a'),
            outline: hexToRgbaColor('#443048'),
            clothing: hexToRgbaColor('#735482'),
            clothingShadow: hexToRgbaColor('#51375d'),
            accent: hexToRgbaColor('#f2b5d4'),
            eye: hexToRgbaColor('#2c1d30'),
            eyeHighlight: hexToRgbaColor('#fff0fb'),
        },
        {
            background: hexToRgbaColor('#ead6ed'),
            backgroundDetail: hexToRgbaColor('#a67abb'),
            face: hexToRgbaColor('#faead7'),
            faceShadow: hexToRgbaColor('#d8baa2'),
            outline: hexToRgbaColor('#4a3650'),
            clothing: hexToRgbaColor('#825e8f'),
            clothingShadow: hexToRgbaColor('#5b4064'),
            accent: hexToRgbaColor('#ffbfd8'),
            eye: hexToRgbaColor('#312234'),
            eyeHighlight: hexToRgbaColor('#fff6fd'),
        },
    ],
};

/**
 * Converts one `#rrggbb` color into an RGBA structure.
 */
function hexToRgbaColor(color: string): RgbaColor {
    return {
        red: parseInt(color.slice(1, 3), 16),
        green: parseInt(color.slice(3, 5), 16),
        blue: parseInt(color.slice(5, 7), 16),
        alpha: 255,
    };
}

/**
 * Creates one empty pixel canvas.
 */
function createPixelCanvas(width: number, height: number): PixelCanvas {
    return {
        width,
        height,
        pixels: new Uint8Array(width * height * 4),
    };
}

/**
 * Writes one pixel if the target coordinates are inside the canvas bounds.
 */
function setPixel(canvas: PixelCanvas, x: number, y: number, color: RgbaColor): void {
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) {
        return;
    }

    const pixelOffset = (y * canvas.width + x) * 4;
    canvas.pixels[pixelOffset] = color.red;
    canvas.pixels[pixelOffset + 1] = color.green;
    canvas.pixels[pixelOffset + 2] = color.blue;
    canvas.pixels[pixelOffset + 3] = color.alpha;
}

/**
 * Fills one rectangle.
 */
function fillRect(canvas: PixelCanvas, x: number, y: number, width: number, height: number, color: RgbaColor): void {
    for (let vertical = 0; vertical < height; vertical++) {
        for (let horizontal = 0; horizontal < width; horizontal++) {
            setPixel(canvas, x + horizontal, y + vertical, color);
        }
    }
}

/**
 * Draws one horizontal mirrored span centered on the avatar axis.
 */
function drawCenteredSpan(canvas: PixelCanvas, centerX: number, y: number, halfWidth: number, color: RgbaColor): void {
    for (let x = centerX - halfWidth; x <= centerX + halfWidth; x++) {
        setPixel(canvas, x, y, color);
    }
}

/**
 * Resolves stable seed bytes from the stored `seedHex`.
 */
function createSeedBytes(seedHex: string): Buffer {
    return Buffer.from(seedHex, 'hex');
}

/**
 * Picks one integer from the seed bytes.
 */
function pickSeedValue(seedBytes: Buffer, offset: number, modulo: number): number {
    return seedBytes[offset % seedBytes.length]! % modulo;
}

/**
 * Resolves one palette variant from the semantic `paletteFamily`.
 */
function resolvePalette(parameters: AgentDefaultAvatarParameters, seedBytes: Buffer): AvatarPalette {
    const paletteFamily = AVATAR_PALETTES[parameters.paletteFamily];
    return paletteFamily[pickSeedValue(seedBytes, 0, paletteFamily.length)] as AvatarPalette;
}

/**
 * Draws the background fill and one deterministic pattern layer.
 */
function drawBackground(
    canvas: PixelCanvas,
    parameters: AgentDefaultAvatarParameters,
    palette: AvatarPalette,
    seedBytes: Buffer,
): void {
    fillRect(canvas, 0, 0, canvas.width, canvas.height, palette.background);

    switch (parameters.backgroundPattern) {
        case 'checker': {
            const offset = pickSeedValue(seedBytes, 1, 2);
            for (let y = 0; y < canvas.height; y += 4) {
                for (let x = 0; x < canvas.width; x += 4) {
                    if (((x / 4 + y / 4 + offset) & 1) === 0) {
                        fillRect(canvas, x, y, 4, 4, palette.backgroundDetail);
                    }
                }
            }
            break;
        }
        case 'sunburst': {
            const centerX = 16;
            const centerY = 14;
            for (let index = 0; index < canvas.width; index++) {
                setPixel(canvas, index, centerY, palette.backgroundDetail);
                setPixel(canvas, centerX, index, palette.backgroundDetail);
                if (index < canvas.height) {
                    setPixel(canvas, index, index, palette.backgroundDetail);
                    setPixel(canvas, canvas.width - 1 - index, index, palette.backgroundDetail);
                }
            }
            break;
        }
        case 'stripes': {
            const offset = pickSeedValue(seedBytes, 2, 6);
            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    if (((x + y + offset) % 6) < 2) {
                        setPixel(canvas, x, y, palette.backgroundDetail);
                    }
                }
            }
            break;
        }
        case 'dots': {
            const xOffset = pickSeedValue(seedBytes, 3, 3);
            const yOffset = pickSeedValue(seedBytes, 4, 3);
            for (let y = 2 + yOffset; y < canvas.height; y += 5) {
                for (let x = 2 + xOffset; x < canvas.width; x += 5) {
                    fillRect(canvas, x, y, 2, 2, palette.backgroundDetail);
                }
            }
            break;
        }
        case 'circuit': {
            for (let y = 3; y < canvas.height; y += 6) {
                fillRect(canvas, 0, y, canvas.width, 1, palette.backgroundDetail);
            }
            for (let x = 3; x < canvas.width; x += 6) {
                fillRect(canvas, x, 0, 1, canvas.height, palette.backgroundDetail);
            }
            for (let y = 3; y < canvas.height; y += 6) {
                for (let x = 3; x < canvas.width; x += 6) {
                    fillRect(canvas, x - 1, y - 1, 3, 3, palette.accent);
                }
            }
            break;
        }
        case 'halo': {
            for (let radius = 2; radius <= 12; radius += 4) {
                fillRect(canvas, 16 - radius, 14 - radius, radius * 2 + 1, 1, palette.backgroundDetail);
                fillRect(canvas, 16 - radius, 14 + radius, radius * 2 + 1, 1, palette.backgroundDetail);
                fillRect(canvas, 16 - radius, 14 - radius, 1, radius * 2 + 1, palette.backgroundDetail);
                fillRect(canvas, 16 + radius, 14 - radius, 1, radius * 2 + 1, palette.backgroundDetail);
            }
            break;
        }
    }
}

/**
 * Draws the layered avatar bust.
 */
function drawBust(canvas: PixelCanvas, parameters: AgentDefaultAvatarParameters, palette: AvatarPalette): void {
    const headRowsByShape: Record<AgentDefaultAvatarParameters['faceShape'], ReadonlyArray<number>> = {
        round: [5, 7, 8, 9, 10, 10, 10, 10, 10, 10, 9, 8, 7, 5],
        square: [7, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 7],
        diamond: [2, 4, 6, 8, 9, 10, 10, 9, 8, 7, 6, 4, 2],
    };
    const shoulderRows = [4, 6, 8, 10, 12, 13, 14, 14, 15];
    const centerX = 16;
    const headStartY = parameters.faceShape === 'diamond' ? 8 : 7;

    headRowsByShape[parameters.faceShape].forEach((halfWidth, rowIndex) => {
        const y = headStartY + rowIndex;
        drawCenteredSpan(canvas, centerX, y, halfWidth + 1, palette.outline);
        drawCenteredSpan(canvas, centerX, y, halfWidth, palette.face);

        if (halfWidth >= 8) {
            setPixel(canvas, centerX - halfWidth + 2, y, palette.faceShadow);
            setPixel(canvas, centerX + halfWidth - 2, y, palette.faceShadow);
        }
    });

    shoulderRows.forEach((halfWidth, rowIndex) => {
        const y = 21 + rowIndex;
        drawCenteredSpan(canvas, centerX, y, halfWidth + 1, palette.outline);
        drawCenteredSpan(canvas, centerX, y, halfWidth, palette.clothing);

        if (halfWidth >= 8) {
            drawCenteredSpan(canvas, centerX, y, Math.max(1, halfWidth - 4), palette.clothingShadow);
        }
    });

    if (parameters.formality >= 3) {
        fillRect(canvas, 15, 22, 2, 7, palette.accent);
        setPixel(canvas, 14, 22, palette.face);
        setPixel(canvas, 17, 22, palette.face);
    }

    if (parameters.archetype === 'guardian') {
        fillRect(canvas, 4, 24, 4, 4, palette.outline);
        fillRect(canvas, 24, 24, 4, 4, palette.outline);
    } else if (parameters.archetype === 'navigator') {
        fillRect(canvas, 5, 23, 3, 3, palette.accent);
        fillRect(canvas, 24, 23, 3, 3, palette.accent);
    } else if (parameters.archetype === 'maker') {
        fillRect(canvas, 8, 6, 2, 3, palette.accent);
        fillRect(canvas, 22, 6, 2, 3, palette.accent);
    } else if (parameters.archetype === 'healer') {
        fillRect(canvas, 15, 4, 2, 3, palette.accent);
        fillRect(canvas, 14, 5, 4, 1, palette.accent);
    } else if (parameters.archetype === 'scholar') {
        fillRect(canvas, 9, 6, 14, 2, palette.outline);
        fillRect(canvas, 10, 7, 12, 1, palette.accent);
    } else if (parameters.archetype === 'mentor') {
        fillRect(canvas, 12, 5, 8, 2, palette.accent);
    }
}

/**
 * Draws the eyes and brows from one semantic eye style.
 */
function drawEyes(canvas: PixelCanvas, parameters: AgentDefaultAvatarParameters, palette: AvatarPalette): void {
    const leftEyeX = 11;
    const rightEyeX = 19;
    const eyeY = parameters.eyeStyle === 'wide' ? 13 : 14;

    switch (parameters.eyeStyle) {
        case 'soft': {
            fillRect(canvas, leftEyeX, eyeY, 3, 2, palette.eye);
            fillRect(canvas, rightEyeX, eyeY, 3, 2, palette.eye);
            setPixel(canvas, leftEyeX + 1, eyeY, palette.eyeHighlight);
            setPixel(canvas, rightEyeX + 1, eyeY, palette.eyeHighlight);
            break;
        }
        case 'focused': {
            fillRect(canvas, leftEyeX, eyeY, 4, 1, palette.eye);
            fillRect(canvas, rightEyeX, eyeY, 4, 1, palette.eye);
            fillRect(canvas, leftEyeX, eyeY - 1, 4, 1, palette.outline);
            fillRect(canvas, rightEyeX, eyeY - 1, 4, 1, palette.outline);
            setPixel(canvas, leftEyeX + 1, eyeY, palette.eyeHighlight);
            setPixel(canvas, rightEyeX + 2, eyeY, palette.eyeHighlight);
            break;
        }
        case 'wide': {
            fillRect(canvas, leftEyeX, eyeY, 3, 3, palette.eyeHighlight);
            fillRect(canvas, rightEyeX, eyeY, 3, 3, palette.eyeHighlight);
            setPixel(canvas, leftEyeX + 1, eyeY + 1, palette.eye);
            setPixel(canvas, rightEyeX + 1, eyeY + 1, palette.eye);
            fillRect(canvas, leftEyeX - 1, eyeY - 1, 5, 1, palette.outline);
            fillRect(canvas, rightEyeX - 1, eyeY - 1, 5, 1, palette.outline);
            break;
        }
        case 'visor': {
            fillRect(canvas, 9, 13, 14, 4, palette.accent);
            fillRect(canvas, 10, 14, 12, 2, palette.eye);
            fillRect(canvas, 11, 14, 10, 1, palette.eyeHighlight);
            break;
        }
    }
}

/**
 * Resolves the mouth style from the semantic kindness, strictness, and energy sliders.
 */
function resolveMouthStyle(parameters: AgentDefaultAvatarParameters): 'smile' | 'neutral' | 'determined' | 'stern' {
    if (parameters.kindness >= parameters.strictness + 2) {
        return 'smile';
    }

    if (parameters.strictness >= parameters.kindness + 2) {
        return 'stern';
    }

    return parameters.energy >= 3 ? 'determined' : 'neutral';
}

/**
 * Draws the mouth and nose line.
 */
function drawMouth(canvas: PixelCanvas, parameters: AgentDefaultAvatarParameters, palette: AvatarPalette): void {
    const mouthStyle = resolveMouthStyle(parameters);

    setPixel(canvas, 16, 17, palette.faceShadow);

    switch (mouthStyle) {
        case 'smile':
            fillRect(canvas, 13, 19, 6, 1, palette.outline);
            setPixel(canvas, 12, 18, palette.outline);
            setPixel(canvas, 19, 18, palette.outline);
            break;
        case 'stern':
            fillRect(canvas, 13, 18, 6, 1, palette.outline);
            setPixel(canvas, 12, 19, palette.outline);
            setPixel(canvas, 19, 19, palette.outline);
            break;
        case 'determined':
            fillRect(canvas, 13, 18, 6, 1, palette.outline);
            setPixel(canvas, 18, 19, palette.outline);
            break;
        case 'neutral':
            fillRect(canvas, 14, 18, 4, 1, palette.outline);
            break;
    }
}

/**
 * Draws the accessory overlay.
 */
function drawAccessory(
    canvas: PixelCanvas,
    parameters: AgentDefaultAvatarParameters,
    palette: AvatarPalette,
    seedBytes: Buffer,
): void {
    switch (parameters.accessory) {
        case 'none':
            return;
        case 'glasses':
            fillRect(canvas, 10, 13, 5, 4, palette.outline);
            fillRect(canvas, 18, 13, 5, 4, palette.outline);
            fillRect(canvas, 12, 14, 1, 1, palette.eyeHighlight);
            fillRect(canvas, 20, 14, 1, 1, palette.eyeHighlight);
            fillRect(canvas, 15, 14, 3, 1, palette.outline);
            break;
        case 'monocle': {
            const leftSide = pickSeedValue(seedBytes, 5, 2) === 0;
            fillRect(canvas, leftSide ? 9 : 18, 13, 5, 5, palette.accent);
            fillRect(canvas, leftSide ? 10 : 19, 14, 3, 3, palette.eyeHighlight);
            fillRect(canvas, leftSide ? 13 : 18, 17, 1, 4, palette.accent);
            break;
        }
        case 'visor':
            fillRect(canvas, 8, 12, 16, 5, palette.accent);
            fillRect(canvas, 10, 14, 12, 1, palette.eyeHighlight);
            break;
        case 'badge':
            fillRect(canvas, 14, 23, 4, 4, palette.accent);
            fillRect(canvas, 15, 24, 2, 2, palette.eyeHighlight);
            break;
        case 'crown':
            fillRect(canvas, 11, 5, 10, 2, palette.accent);
            setPixel(canvas, 12, 4, palette.accent);
            setPixel(canvas, 16, 3, palette.accent);
            setPixel(canvas, 20, 4, palette.accent);
            break;
    }
}

/**
 * Draws two small semantic glyphs derived from `traitTags`.
 */
function drawTraitGlyphs(canvas: PixelCanvas, parameters: AgentDefaultAvatarParameters, palette: AvatarPalette): void {
    const drawGlyph = (traitTag: AgentDefaultAvatarParameters['traitTags'][number], x: number, y: number) => {
        switch (traitTag) {
            case 'kind':
                setPixel(canvas, x + 1, y, palette.accent);
                setPixel(canvas, x, y + 1, palette.accent);
                setPixel(canvas, x + 2, y + 1, palette.accent);
                setPixel(canvas, x + 1, y + 2, palette.accent);
                break;
            case 'strict':
                fillRect(canvas, x, y, 3, 1, palette.accent);
                fillRect(canvas, x + 1, y, 1, 3, palette.accent);
                break;
            case 'curious':
                setPixel(canvas, x, y, palette.accent);
                setPixel(canvas, x + 1, y + 1, palette.accent);
                setPixel(canvas, x + 2, y, palette.accent);
                setPixel(canvas, x + 1, y + 2, palette.accent);
                break;
            case 'calm':
                fillRect(canvas, x, y + 1, 3, 1, palette.accent);
                break;
            case 'bold':
                setPixel(canvas, x + 1, y, palette.accent);
                fillRect(canvas, x, y + 1, 3, 1, palette.accent);
                setPixel(canvas, x + 1, y + 2, palette.accent);
                break;
            case 'protective':
                fillRect(canvas, x + 1, y, 1, 1, palette.accent);
                fillRect(canvas, x, y + 1, 3, 1, palette.accent);
                fillRect(canvas, x, y + 2, 3, 1, palette.accent);
                break;
            case 'creative':
                setPixel(canvas, x + 1, y, palette.accent);
                setPixel(canvas, x, y + 1, palette.accent);
                setPixel(canvas, x + 2, y + 1, palette.accent);
                setPixel(canvas, x + 1, y + 2, palette.accent);
                setPixel(canvas, x + 1, y + 1, palette.eyeHighlight);
                break;
            case 'analytical':
                fillRect(canvas, x, y, 3, 1, palette.accent);
                fillRect(canvas, x, y + 1, 3, 1, palette.eyeHighlight);
                fillRect(canvas, x, y + 2, 3, 1, palette.accent);
                break;
        }
    };

    drawGlyph(parameters.traitTags[0], 4, 26);
    drawGlyph(parameters.traitTags[1], 25, 26);
}

/**
 * Upscales the logical canvas using nearest-neighbor replication.
 */
function upscaleCanvas(sourceCanvas: PixelCanvas, scale: number): PixelCanvas {
    const scaledCanvas = createPixelCanvas(sourceCanvas.width * scale, sourceCanvas.height * scale);

    for (let y = 0; y < sourceCanvas.height; y++) {
        for (let x = 0; x < sourceCanvas.width; x++) {
            const pixelOffset = (y * sourceCanvas.width + x) * 4;
            const color: RgbaColor = {
                red: sourceCanvas.pixels[pixelOffset]!,
                green: sourceCanvas.pixels[pixelOffset + 1]!,
                blue: sourceCanvas.pixels[pixelOffset + 2]!,
                alpha: sourceCanvas.pixels[pixelOffset + 3]!,
            };

            fillRect(scaledCanvas, x * scale, y * scale, scale, scale, color);
        }
    }

    return scaledCanvas;
}

/**
 * Computes Adler-32 for the deterministic zlib wrapper.
 */
function computeAdler32(data: Uint8Array): number {
    let a = 1;
    let b = 0;

    for (const value of data) {
        a = (a + value) % 65521;
        b = (b + a) % 65521;
    }

    return ((b << 16) | a) >>> 0;
}

/**
 * Computes CRC32 for a PNG chunk.
 */
function computeCrc32(data: Buffer): number {
    let crc = 0xffffffff;

    for (const value of data) {
        crc = CRC32_TABLE[(crc ^ value) & 0xff]! ^ (crc >>> 8);
    }

    return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Encodes one PNG chunk.
 */
function createPngChunk(type: string, data: Buffer): Buffer {
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32BE(data.length, 0);

    const typeBuffer = Buffer.from(type, 'ascii');
    const crcBuffer = Buffer.alloc(4);
    crcBuffer.writeUInt32BE(computeCrc32(Buffer.concat([typeBuffer, data])), 0);

    return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

/**
 * Wraps raw image data into a deterministic zlib stream using uncompressed DEFLATE blocks.
 */
function createDeterministicZlibStream(data: Uint8Array): Buffer {
    const parts: Buffer[] = [Buffer.from([0x78, 0x01])];
    let offset = 0;

    while (offset < data.length) {
        const remainingBytes = data.length - offset;
        const blockLength = Math.min(65535, remainingBytes);
        const isFinalBlock = offset + blockLength >= data.length;
        const blockHeader = Buffer.alloc(5);

        blockHeader[0] = isFinalBlock ? 0x01 : 0x00;
        blockHeader.writeUInt16LE(blockLength, 1);
        blockHeader.writeUInt16LE((~blockLength) & 0xffff, 3);

        parts.push(blockHeader, Buffer.from(data.subarray(offset, offset + blockLength)));
        offset += blockLength;
    }

    const adlerBuffer = Buffer.alloc(4);
    adlerBuffer.writeUInt32BE(computeAdler32(data), 0);
    parts.push(adlerBuffer);

    return Buffer.concat(parts);
}

/**
 * Encodes one RGBA canvas into a deterministic PNG byte buffer.
 */
function encodeCanvasToPng(canvas: PixelCanvas): Buffer {
    const rawRows = new Uint8Array((canvas.width * 4 + 1) * canvas.height);

    for (let y = 0; y < canvas.height; y++) {
        const rowOffset = y * (canvas.width * 4 + 1);
        rawRows[rowOffset] = 0;
        rawRows.set(
            canvas.pixels.subarray(y * canvas.width * 4, (y + 1) * canvas.width * 4),
            rowOffset + 1,
        );
    }

    const headerBuffer = Buffer.alloc(13);
    headerBuffer.writeUInt32BE(canvas.width, 0);
    headerBuffer.writeUInt32BE(canvas.height, 4);
    headerBuffer[8] = 8;
    headerBuffer[9] = 6;
    headerBuffer[10] = 0;
    headerBuffer[11] = 0;
    headerBuffer[12] = 0;

    return Buffer.concat([
        PNG_SIGNATURE,
        createPngChunk('IHDR', headerBuffer),
        createPngChunk('IDAT', createDeterministicZlibStream(rawRows)),
        createPngChunk('IEND', Buffer.alloc(0)),
    ]);
}

/**
 * Renders one deterministic default-avatar PNG from the stored stage-1 parameters.
 */
export function renderAgentDefaultAvatarPng(parameters: AgentDefaultAvatarParameters): Buffer {
    const seedBytes = createSeedBytes(parameters.seedHex);
    const palette = resolvePalette(parameters, seedBytes);
    const logicalCanvas = createPixelCanvas(LOGICAL_AVATAR_SIZE, LOGICAL_AVATAR_SIZE);

    drawBackground(logicalCanvas, parameters, palette, seedBytes);
    drawBust(logicalCanvas, parameters, palette);
    drawEyes(logicalCanvas, parameters, palette);
    drawMouth(logicalCanvas, parameters, palette);
    drawAccessory(logicalCanvas, parameters, palette, seedBytes);
    drawTraitGlyphs(logicalCanvas, parameters, palette);

    if (parameters.energy >= 3) {
        fillRect(logicalCanvas, 6, 6, 2, 2, palette.accent);
        fillRect(logicalCanvas, 24, 7, 2, 2, palette.accent);
    }

    if (parameters.kindness >= 3) {
        setPixel(logicalCanvas, 10, 18, palette.accent);
        setPixel(logicalCanvas, 22, 18, palette.accent);
    }

    return encodeCanvasToPng(upscaleCanvas(logicalCanvas, OUTPUT_SCALE));
}
