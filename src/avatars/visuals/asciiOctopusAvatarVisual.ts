/* eslint-disable no-magic-numbers */

import { drawAvatarFrame } from '../avatarRenderingUtils';
import type { AvatarPalette, AvatarVisualDefinition } from '../types/AvatarVisualDefinition';
import type { OrganicTentacleRibbonPoint } from './octopusAvatarVisualShared';
import {
    createOrganicOctopusBodyPoints,
    createOrganicOctopusTentacleShapes,
    resolveOrganicEyeMotion,
    sampleOrganicTentacleRibbonPoints,
} from './octopusAvatarVisualShared';

/**
 * Glyph ramp used for the main octopus body fill.
 *
 * @private helper of `asciiOctopusAvatarVisual`
 */
const BODY_GLYPHS = ['.', ':', '-', '=', '+', '*', '#', '%', '@'];

/**
 * Glyph ramp used on silhouette edges so the ASCII blob stays legible.
 *
 * @private helper of `asciiOctopusAvatarVisual`
 */
const OUTLINE_GLYPHS = ['#', '%', '@'];

/**
 * Glyph ramp used in the surrounding atmosphere.
 *
 * @private helper of `asciiOctopusAvatarVisual`
 */
const ATMOSPHERE_GLYPHS = ['.', ':', "'", '`'];

/**
 * One 2D point used by the ASCII octopus helpers.
 *
 * @private helper of `asciiOctopusAvatarVisual`
 */
type Point = {
    readonly x: number;
    readonly y: number;
};

/**
 * Character-grid metrics used by the ASCII renderer.
 *
 * @private helper of `asciiOctopusAvatarVisual`
 */
type AsciiGridMetrics = {
    readonly fontSize: number;
    readonly cellWidth: number;
    readonly cellHeight: number;
    readonly columnCount: number;
    readonly rowCount: number;
    readonly offsetX: number;
    readonly offsetY: number;
};

/**
 * One seeded eye definition used by the ASCII renderer.
 *
 * @private helper of `asciiOctopusAvatarVisual`
 */
type EyeFeature = {
    readonly centerX: number;
    readonly centerY: number;
    readonly radiusX: number;
    readonly radiusY: number;
    readonly rotation: number;
    readonly phase: number;
};

/**
 * Prepared geometry for one rendered ASCII octopus frame.
 *
 * @private helper of `asciiOctopusAvatarVisual`
 */
type AsciiOctopusLayout = {
    readonly centerX: number;
    readonly centerY: number;
    readonly bodyRadius: number;
    readonly horizontalStretch: number;
    readonly shapePhase: number;
    readonly interaction: {
        readonly gazeX: number;
        readonly gazeY: number;
        readonly intensity: number;
    };
    readonly bodyPoints: ReadonlyArray<Point>;
    readonly sampledTentacles: ReadonlyArray<ReadonlyArray<OrganicTentacleRibbonPoint>>;
    readonly leftEye: EyeFeature;
    readonly rightEye: EyeFeature;
    readonly mouthPoints: ReadonlyArray<Point>;
    readonly leftBound: number;
    readonly rightBound: number;
    readonly topBound: number;
    readonly bottomBound: number;
};

/**
 * One resolved character and fill color for a grid cell.
 *
 * @private helper of `asciiOctopusAvatarVisual`
 */
type AsciiGlyphDescriptor = {
    readonly character: string;
    readonly color: string;
};

/**
 * Nearest tentacle influence sampled at one character cell.
 *
 * @private helper of `asciiOctopusAvatarVisual`
 */
type TentacleCoverage = {
    readonly tangentAngle: number;
    readonly progress: number;
    readonly normalizedDistance: number;
};

/**
 * AsciiOctopus avatar visual.
 *
 * @private built-in avatar visual
 */
export const asciiOctopusAvatarVisual: AvatarVisualDefinition = {
    id: 'ascii-octopus',
    title: 'AsciiOctopus',
    description:
        'Morphing alien octopus translated into animated ASCII glyphs with responsive eyes and seeded geometry.',
    isAnimated: true,
    supportsPointerTracking: true,
    render({ context, size, palette, createRandom, timeMs, interaction }) {
        const gridRandom = createRandom('ascii-octopus-grid');
        const staticRandom = createRandom('ascii-octopus-static');
        const gridMetrics = createAsciiGridMetrics(size, gridRandom);
        const layout = createAsciiOctopusLayout(size, timeMs, createRandom, staticRandom, interaction);

        drawAvatarFrame(context, size, palette);
        drawAsciiBackdrop(context, size, palette, layout, timeMs);

        context.save();
        context.font = `600 ${gridMetrics.fontSize}px monospace`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        // The ASCII renderer samples the morphing octopus field on a low-resolution grid so the shape stays organic
        // while the glyph layout remains deterministic for the same avatar input.
        const cellRandom = createRandom('ascii-octopus-cells');

        for (let rowIndex = 0; rowIndex < gridMetrics.rowCount; rowIndex++) {
            for (let columnIndex = 0; columnIndex < gridMetrics.columnCount; columnIndex++) {
                const point = {
                    x: gridMetrics.offsetX + columnIndex * gridMetrics.cellWidth,
                    y: gridMetrics.offsetY + rowIndex * gridMetrics.cellHeight,
                };
                const noise = cellRandom();
                const glyphDescriptor = resolveAsciiGlyph({
                    point,
                    layout,
                    palette,
                    cellWidth: gridMetrics.cellWidth,
                    cellHeight: gridMetrics.cellHeight,
                    noise,
                    timeMs,
                });

                if (!glyphDescriptor) {
                    continue;
                }

                context.fillStyle = glyphDescriptor.color;
                context.fillText(glyphDescriptor.character, point.x, point.y);
            }
        }

        context.restore();
    },
};

/**
 * Draws the dark terminal-like glow behind the ASCII octopus.
 *
 * @param context Canvas 2D context.
 * @param size Canvas size in CSS pixels.
 * @param palette Derived avatar palette.
 * @param layout Prepared octopus layout.
 * @param timeMs Current animation time in milliseconds.
 *
 * @private helper of `asciiOctopusAvatarVisual`
 */
function drawAsciiBackdrop(
    context: CanvasRenderingContext2D,
    size: number,
    palette: AvatarPalette,
    layout: AsciiOctopusLayout,
    timeMs: number,
): void {
    const haloGradient = context.createRadialGradient(
        layout.centerX,
        layout.centerY - size * 0.12,
        size * 0.06,
        layout.centerX,
        layout.centerY,
        size * 0.62,
    );
    haloGradient.addColorStop(0, `${palette.highlight}26`);
    haloGradient.addColorStop(0.42, `${palette.accent}16`);
    haloGradient.addColorStop(1, `${palette.highlight}00`);
    context.fillStyle = haloGradient;
    context.fillRect(0, 0, size, size);

    const lowerGlowGradient = context.createRadialGradient(
        layout.centerX + Math.sin(timeMs / 1100 + layout.shapePhase) * size * 0.03,
        layout.centerY + size * 0.2,
        size * 0.05,
        layout.centerX,
        layout.centerY + size * 0.24,
        size * 0.46,
    );
    lowerGlowGradient.addColorStop(0, `${palette.secondary}1f`);
    lowerGlowGradient.addColorStop(1, `${palette.secondary}00`);
    context.fillStyle = lowerGlowGradient;
    context.fillRect(0, 0, size, size);

    context.beginPath();
    context.ellipse(layout.centerX, layout.centerY + size * 0.29, size * 0.23, size * 0.065, 0, 0, Math.PI * 2);
    context.fillStyle = `${palette.shadow}33`;
    context.fill();
}

/**
 * Resolves the ASCII character that should be drawn for one sampled cell.
 *
 * @param options Cell evaluation options.
 * @returns Character descriptor or `null` when the cell should stay empty.
 *
 * @private helper of `asciiOctopusAvatarVisual`
 */
function resolveAsciiGlyph(options: {
    point: Point;
    layout: AsciiOctopusLayout;
    palette: AvatarPalette;
    cellWidth: number;
    cellHeight: number;
    noise: number;
    timeMs: number;
}): AsciiGlyphDescriptor | null {
    const { point, layout, palette, cellWidth, cellHeight, noise, timeMs } = options;
    const eyeGlyphDescriptor =
        resolveEyeGlyph(point, layout.leftEye, layout.interaction, palette, timeMs) ||
        resolveEyeGlyph(point, layout.rightEye, layout.interaction, palette, timeMs);

    if (eyeGlyphDescriptor) {
        return eyeGlyphDescriptor;
    }

    const mouthGlyphDescriptor = resolveMouthGlyph(point, layout, palette, cellHeight);

    if (mouthGlyphDescriptor) {
        return mouthGlyphDescriptor;
    }

    const isWithinOctopusBounds =
        point.x >= layout.leftBound &&
        point.x <= layout.rightBound &&
        point.y >= layout.topBound &&
        point.y <= layout.bottomBound;

    if (!isWithinOctopusBounds) {
        return resolveAtmosphereGlyph(point, layout, palette, noise, timeMs);
    }

    const isInsideBody = isPointInsidePolygon(point, layout.bodyPoints);
    const bodyEdgeDistance = isInsideBody
        ? getDistanceToPolyline(point, layout.bodyPoints, true)
        : Number.POSITIVE_INFINITY;
    const tentacleCoverage = measureTentacleCoverage(point, layout.sampledTentacles, cellWidth);

    if (isInsideBody || tentacleCoverage) {
        return resolveOctopusSurfaceGlyph({
            point,
            layout,
            palette,
            isInsideBody,
            bodyEdgeDistance,
            tentacleCoverage,
            cellWidth,
            cellHeight,
            noise,
            timeMs,
        });
    }

    return resolveAtmosphereGlyph(point, layout, palette, noise, timeMs);
}

/**
 * Resolves the ASCII character for one eye cell.
 *
 * @param point Sampled cell point.
 * @param eyeFeature Eye geometry.
 * @param palette Derived avatar palette.
 * @param timeMs Current animation time in milliseconds.
 * @returns Eye glyph descriptor or `null`.
 *
 * @private helper of `asciiOctopusAvatarVisual`
 */
function resolveEyeGlyph(
    point: Point,
    eyeFeature: EyeFeature,
    interaction: {
        readonly gazeX: number;
        readonly gazeY: number;
        readonly intensity: number;
    },
    palette: AvatarPalette,
    timeMs: number,
): AsciiGlyphDescriptor | null {
    const { pupilOffsetX, pupilOffsetY } = resolveOrganicEyeMotion({
        radiusX: eyeFeature.radiusX,
        radiusY: eyeFeature.radiusY,
        timeMs,
        phase: eyeFeature.phase,
        interaction,
    });
    const scleraDistance = measureRotatedEllipseDistance(
        point,
        eyeFeature.centerX,
        eyeFeature.centerY,
        eyeFeature.radiusX,
        eyeFeature.radiusY,
        eyeFeature.rotation,
    );

    if (scleraDistance > 1.08) {
        return null;
    }

    const highlightDistance = measureRotatedEllipseDistance(
        point,
        eyeFeature.centerX + pupilOffsetX - eyeFeature.radiusX * 0.24,
        eyeFeature.centerY + pupilOffsetY - eyeFeature.radiusY * 0.26,
        eyeFeature.radiusX * 0.18,
        eyeFeature.radiusY * 0.14,
        eyeFeature.rotation,
    );

    if (highlightDistance <= 1) {
        return { character: '*', color: '#ffffff' };
    }

    const pupilDistance = measureRotatedEllipseDistance(
        point,
        eyeFeature.centerX + pupilOffsetX,
        eyeFeature.centerY + pupilOffsetY,
        eyeFeature.radiusX * 0.2,
        eyeFeature.radiusY * 0.48,
        eyeFeature.rotation,
    );

    if (pupilDistance <= 1) {
        return { character: '@', color: palette.ink };
    }

    const irisDistance = measureRotatedEllipseDistance(
        point,
        eyeFeature.centerX + pupilOffsetX,
        eyeFeature.centerY + pupilOffsetY,
        eyeFeature.radiusX * 0.64,
        eyeFeature.radiusY * 0.72,
        eyeFeature.rotation,
    );

    if (irisDistance <= 1) {
        return {
            character: irisDistance < 0.46 ? '0' : 'o',
            color: irisDistance < 0.62 ? palette.secondary : `${palette.highlight}d9`,
        };
    }

    return {
        character: scleraDistance > 0.82 ? 'o' : '0',
        color: '#f8fbff',
    };
}

/**
 * Resolves the ASCII character for the octopus mouth.
 *
 * @param point Sampled cell point.
 * @param layout Prepared octopus layout.
 * @param palette Derived avatar palette.
 * @param cellHeight Character cell height.
 * @returns Mouth glyph descriptor or `null`.
 *
 * @private helper of `asciiOctopusAvatarVisual`
 */
function resolveMouthGlyph(
    point: Point,
    layout: AsciiOctopusLayout,
    palette: AvatarPalette,
    cellHeight: number,
): AsciiGlyphDescriptor | null {
    const mouthDistance = getDistanceToPolyline(point, layout.mouthPoints, false);

    if (mouthDistance > cellHeight * 0.38) {
        return null;
    }

    const horizontalProgress = clamp01(
        (point.x - layout.mouthPoints[0]!.x) /
            (layout.mouthPoints[layout.mouthPoints.length - 1]!.x - layout.mouthPoints[0]!.x),
    );
    let character = '-';

    if (horizontalProgress < 0.28) {
        character = '\\';
    } else if (horizontalProgress > 0.72) {
        character = '/';
    } else if (horizontalProgress > 0.42 && horizontalProgress < 0.58) {
        character = '_';
    }

    return {
        character,
        color: `${palette.ink}bf`,
    };
}

/**
 * Resolves the ASCII character for body and tentacle cells.
 *
 * @param options Surface evaluation options.
 * @returns Surface glyph descriptor.
 *
 * @private helper of `asciiOctopusAvatarVisual`
 */
function resolveOctopusSurfaceGlyph(options: {
    point: Point;
    layout: AsciiOctopusLayout;
    palette: AvatarPalette;
    isInsideBody: boolean;
    bodyEdgeDistance: number;
    tentacleCoverage: TentacleCoverage | null;
    cellWidth: number;
    cellHeight: number;
    noise: number;
    timeMs: number;
}): AsciiGlyphDescriptor {
    const { point, layout, palette, isInsideBody, bodyEdgeDistance, tentacleCoverage, cellHeight, noise, timeMs } =
        options;
    const isTentacleDominant =
        tentacleCoverage !== null && (!isInsideBody || point.y > layout.centerY + layout.bodyRadius * 0.08);

    if (isTentacleDominant && tentacleCoverage) {
        const isSuckerBand = tentacleCoverage.progress > 0.24 && tentacleCoverage.progress < 0.82 && noise > 0.78;

        if (isSuckerBand && tentacleCoverage.normalizedDistance > 0.42) {
            return {
                character: noise > 0.9 ? '0' : 'o',
                color: `${palette.highlight}d0`,
            };
        }

        return {
            character: pickTentacleCharacter(tentacleCoverage, noise),
            color:
                tentacleCoverage.progress < 0.24
                    ? `${palette.secondary}c7`
                    : tentacleCoverage.progress > 0.72
                    ? `${palette.accent}bf`
                    : tentacleCoverage.normalizedDistance > 0.7
                    ? `${palette.highlight}bf`
                    : `${palette.primary}c9`,
        };
    }

    const highlightBias = clamp01((layout.centerY - point.y + layout.bodyRadius * 0.44) / (layout.bodyRadius * 1.14));
    const bodyDepth = clamp01(1 - bodyEdgeDistance / (layout.bodyRadius * 0.9));
    const shimmer = Math.sin(timeMs / 720 + point.x * 0.085 + point.y * 0.06 + layout.shapePhase) * 0.05;
    const bodyIntensity = clamp01(0.22 + bodyDepth * 0.58 + highlightBias * 0.2 + shimmer + (noise - 0.5) * 0.18);
    const isOutline = isInsideBody && bodyEdgeDistance < cellHeight * 0.54;
    const character = isOutline
        ? pickRampCharacter(OUTLINE_GLYPHS, clamp01(0.58 + bodyIntensity * 0.42))
        : pickRampCharacter(BODY_GLYPHS, bodyIntensity);
    let color = `${palette.primary}bf`;

    if (highlightBias > 0.76) {
        color = `${palette.highlight}d9`;
    } else if (bodyDepth > 0.7) {
        color = `${palette.secondary}cb`;
    } else if ((point.x < layout.centerX && noise > 0.58) || (point.x >= layout.centerX && noise < 0.42)) {
        color = `${palette.accent}ba`;
    }

    return {
        character,
        color: isOutline ? `${palette.highlight}c9` : color,
    };
}

/**
 * Resolves faint atmosphere glyphs around the ASCII octopus.
 *
 * @param point Sampled cell point.
 * @param layout Prepared octopus layout.
 * @param palette Derived avatar palette.
 * @param noise Stable per-cell noise.
 * @param timeMs Current animation time in milliseconds.
 * @returns Atmosphere glyph descriptor or `null`.
 *
 * @private helper of `asciiOctopusAvatarVisual`
 */
function resolveAtmosphereGlyph(
    point: Point,
    layout: AsciiOctopusLayout,
    palette: AvatarPalette,
    noise: number,
    timeMs: number,
): AsciiGlyphDescriptor | null {
    const horizontalDistance =
        Math.abs(point.x - layout.centerX) / (layout.bodyRadius * layout.horizontalStretch * 2.2);
    const verticalDistance =
        Math.abs(point.y - (layout.centerY + layout.bodyRadius * 0.04)) / (layout.bodyRadius * 2.1);
    const haloDistance = Math.hypot(horizontalDistance, verticalDistance);
    const shimmer = Math.sin(timeMs / 1450 + point.x * 0.03 + point.y * 0.04 + layout.shapePhase) * 0.06;
    const density = clamp01(1.16 - haloDistance + shimmer + (noise - 0.5) * 0.14);

    if (density < 0.18 || noise > density * 0.84 + 0.34) {
        return null;
    }

    return {
        character: pickRampCharacter(ATMOSPHERE_GLYPHS, density),
        color: point.y < layout.centerY ? `${palette.highlight}63` : `${palette.accent}47`,
    };
}

/**
 * Builds the grid used by the ASCII renderer.
 *
 * @param size Canvas size in CSS pixels.
 * @param staticRandom Stable random generator for this avatar.
 * @returns Grid metrics.
 *
 * @private helper of `asciiOctopusAvatarVisual`
 */
function createAsciiGridMetrics(size: number, staticRandom: () => number): AsciiGridMetrics {
    const fontSize = Math.max(9, Math.round(size * (0.048 + staticRandom() * 0.006)));
    const cellWidth = fontSize * (0.58 + staticRandom() * 0.04);
    const cellHeight = fontSize * 0.82;
    const columnCount = Math.max(12, Math.floor(size / cellWidth) - 1);
    const rowCount = Math.max(12, Math.floor(size / cellHeight) - 1);
    const offsetX = (size - (columnCount - 1) * cellWidth) / 2;
    const offsetY = (size - (rowCount - 1) * cellHeight) / 2;

    return {
        fontSize,
        cellWidth,
        cellHeight,
        columnCount,
        rowCount,
        offsetX,
        offsetY,
    };
}

/**
 * Builds the deterministic octopus geometry that will later be sampled into ASCII cells.
 *
 * @param size Canvas size in CSS pixels.
 * @param timeMs Current animation time in milliseconds.
 * @param createRandom Seeded random factory scoped to the avatar.
 * @param staticRandom Stable random generator for this avatar.
 * @returns Prepared octopus layout.
 *
 * @private helper of `asciiOctopusAvatarVisual`
 */
function createAsciiOctopusLayout(
    size: number,
    timeMs: number,
    createRandom: (salt: string) => () => number,
    staticRandom: () => number,
    interaction: {
        readonly gazeX: number;
        readonly gazeY: number;
        readonly bodyOffsetX: number;
        readonly bodyOffsetY: number;
        readonly intensity: number;
    },
): AsciiOctopusLayout {
    const centerX = size * (0.5 + (staticRandom() - 0.5) * 0.02) + interaction.bodyOffsetX * size * 0.05;
    const centerY = size * (0.41 + staticRandom() * 0.05) + interaction.bodyOffsetY * size * 0.035;
    const bodyRadius = size * (0.195 + staticRandom() * 0.05);
    const horizontalStretch = 1.08 + staticRandom() * 0.22;
    const verticalStretch = 0.88 + staticRandom() * 0.14;
    const mantleLift = size * (0.1 + staticRandom() * 0.03);
    const lowerDrop = size * (0.03 + staticRandom() * 0.024);
    const tentacleDepth = size * (0.026 + staticRandom() * 0.022);
    const wobbleAmplitude = size * (0.008 + staticRandom() * 0.01);
    const lobeCount = 5 + Math.floor(staticRandom() * 4);
    const shapePhase = staticRandom() * Math.PI * 2;
    const tentacleCount = 8 + Math.floor(staticRandom() * 5);
    const eyeSpacing = size * (0.108 + staticRandom() * 0.042);
    const eyeRadiusX = size * (0.05 + staticRandom() * 0.015);
    const eyeRadiusY = eyeRadiusX * (1.16 + staticRandom() * 0.2);
    const bodyPoints = createOrganicOctopusBodyPoints({
        centerX,
        centerY,
        bodyRadius,
        horizontalStretch,
        verticalStretch,
        mantleLift,
        lowerDrop,
        tentacleDepth,
        wobbleAmplitude,
        lobeCount,
        shapePhase,
        timeMs,
        pointCount: 40,
    });
    const tentacleShapes = createOrganicOctopusTentacleShapes({
        size,
        centerX,
        centerY,
        bodyRadius,
        horizontalStretch,
        tentacleCount,
        shapePhase,
        createRandom,
        timeMs,
        saltPrefix: 'ascii-octopus',
        bodyPoints,
    });
    const sampledTentacles = tentacleShapes.map(sampleOrganicTentacleRibbonPoints);
    const leftEye = {
        centerX: centerX - eyeSpacing,
        centerY: centerY - size * 0.01,
        radiusX: eyeRadiusX,
        radiusY: eyeRadiusY,
        rotation: (staticRandom() - 0.5) * 0.24,
        phase: shapePhase,
    };
    const rightEye = {
        centerX: centerX + eyeSpacing,
        centerY: centerY - size * 0.01,
        radiusX: eyeRadiusX,
        radiusY: eyeRadiusY,
        rotation: (staticRandom() - 0.5) * 0.24,
        phase: shapePhase + Math.PI / 4,
    };
    const mouthPoints = sampleQuadraticBezierPoints(
        { x: centerX - size * 0.074, y: centerY + size * 0.092 },
        {
            x: centerX,
            y:
                centerY +
                size * (0.142 + Math.sin(timeMs / 620 + shapePhase) * 0.016) +
                interaction.gazeY * size * 0.012,
        },
        { x: centerX + size * 0.074, y: centerY + size * 0.092 },
        12,
    );

    let leftBound = Number.POSITIVE_INFINITY;
    let rightBound = Number.NEGATIVE_INFINITY;
    let topBound = Number.POSITIVE_INFINITY;
    let bottomBound = Number.NEGATIVE_INFINITY;

    for (const bodyPoint of bodyPoints) {
        leftBound = Math.min(leftBound, bodyPoint.x);
        rightBound = Math.max(rightBound, bodyPoint.x);
        topBound = Math.min(topBound, bodyPoint.y);
        bottomBound = Math.max(bottomBound, bodyPoint.y);
    }

    for (const sampledTentacle of sampledTentacles) {
        for (const ribbonPoint of sampledTentacle) {
            leftBound = Math.min(leftBound, ribbonPoint.x - ribbonPoint.width);
            rightBound = Math.max(rightBound, ribbonPoint.x + ribbonPoint.width);
            topBound = Math.min(topBound, ribbonPoint.y - ribbonPoint.width);
            bottomBound = Math.max(bottomBound, ribbonPoint.y + ribbonPoint.width);
        }
    }

    return {
        centerX,
        centerY,
        bodyRadius,
        horizontalStretch,
        shapePhase,
        interaction,
        bodyPoints,
        sampledTentacles,
        leftEye,
        rightEye,
        mouthPoints,
        leftBound: leftBound - size * 0.08,
        rightBound: rightBound + size * 0.08,
        topBound: topBound - size * 0.08,
        bottomBound: bottomBound + size * 0.08,
    };
}

/**
 * Samples points along a quadratic Bezier curve.
 *
 * @param startPoint Curve start point.
 * @param controlPoint Curve control point.
 * @param endPoint Curve end point.
 * @param pointCount Number of intervals to sample.
 * @returns Sampled curve points.
 *
 * @private helper of `asciiOctopusAvatarVisual`
 */
function sampleQuadraticBezierPoints(
    startPoint: Point,
    controlPoint: Point,
    endPoint: Point,
    pointCount: number,
): Array<Point> {
    return Array.from({ length: pointCount + 1 }, (_, pointIndex) => {
        const progress = pointIndex / pointCount;
        const inverseProgress = 1 - progress;

        return {
            x:
                inverseProgress * inverseProgress * startPoint.x +
                2 * inverseProgress * progress * controlPoint.x +
                progress * progress * endPoint.x,
            y:
                inverseProgress * inverseProgress * startPoint.y +
                2 * inverseProgress * progress * controlPoint.y +
                progress * progress * endPoint.y,
        };
    });
}

/**
 * Measures how strongly the sampled cell intersects with the generated tentacles.
 *
 * @param point Sampled cell point.
 * @param sampledTentacles Pre-sampled tentacle ribbons.
 * @param cellWidth Character cell width.
 * @returns Nearest tentacle coverage or `null`.
 *
 * @private helper of `asciiOctopusAvatarVisual`
 */
function measureTentacleCoverage(
    point: Point,
    sampledTentacles: ReadonlyArray<ReadonlyArray<OrganicTentacleRibbonPoint>>,
    cellWidth: number,
): TentacleCoverage | null {
    let bestTentacleCoverage: TentacleCoverage | null = null;
    let bestNormalizedDistance = 0;

    for (const sampledTentacle of sampledTentacles) {
        for (const ribbonPoint of sampledTentacle) {
            const deltaX = point.x - ribbonPoint.x;
            const deltaY = point.y - ribbonPoint.y;
            const distance = Math.hypot(deltaX, deltaY);
            const coverageRadius = ribbonPoint.width + cellWidth * 0.22;
            const normalizedDistance = 1 - distance / coverageRadius;

            if (normalizedDistance <= bestNormalizedDistance || normalizedDistance <= 0) {
                continue;
            }

            bestNormalizedDistance = normalizedDistance;
            bestTentacleCoverage = {
                tangentAngle: Math.atan2(-ribbonPoint.normalX, ribbonPoint.normalY),
                progress: ribbonPoint.progress,
                normalizedDistance,
            };
        }
    }

    return bestTentacleCoverage;
}

/**
 * Picks one ASCII character that matches the nearest tentacle direction.
 *
 * @param tentacleCoverage Nearest tentacle coverage.
 * @param noise Stable per-cell noise.
 * @returns Tentacle ASCII character.
 *
 * @private helper of `asciiOctopusAvatarVisual`
 */
function pickTentacleCharacter(tentacleCoverage: TentacleCoverage, noise: number): string {
    const isSuckerBand = tentacleCoverage.progress > 0.24 && tentacleCoverage.progress < 0.82 && noise > 0.82;

    if (isSuckerBand && tentacleCoverage.normalizedDistance > 0.34) {
        return noise > 0.91 ? '0' : 'o';
    }

    const horizontalWeight = Math.abs(Math.cos(tentacleCoverage.tangentAngle));
    const verticalWeight = Math.abs(Math.sin(tentacleCoverage.tangentAngle));

    if (horizontalWeight > 0.84) {
        return noise > 0.52 ? '=' : '-';
    }

    if (verticalWeight > 0.82) {
        return noise > 0.56 ? '|' : '!';
    }

    return Math.sin(tentacleCoverage.tangentAngle) * Math.cos(tentacleCoverage.tangentAngle) > 0 ? '\\' : '/';
}

/**
 * Picks one character from an ordered ramp.
 *
 * @param glyphRamp Ordered glyph ramp.
 * @param intensity Normalized intensity in the range `[0, 1]`.
 * @returns Selected glyph.
 *
 * @private helper of `asciiOctopusAvatarVisual`
 */
function pickRampCharacter(glyphRamp: ReadonlyArray<string>, intensity: number): string {
    const characterIndex = Math.min(glyphRamp.length - 1, Math.floor(clamp01(intensity) * glyphRamp.length));

    return glyphRamp[characterIndex]!;
}

/**
 * Measures the normalized distance from a point to a rotated ellipse.
 *
 * @param point Sampled cell point.
 * @param centerX Ellipse center X coordinate.
 * @param centerY Ellipse center Y coordinate.
 * @param radiusX Horizontal ellipse radius.
 * @param radiusY Vertical ellipse radius.
 * @param rotation Ellipse rotation in radians.
 * @returns Normalized ellipse distance where values below `1` are inside.
 *
 * @private helper of `asciiOctopusAvatarVisual`
 */
function measureRotatedEllipseDistance(
    point: Point,
    centerX: number,
    centerY: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
): number {
    const cosine = Math.cos(rotation);
    const sine = Math.sin(rotation);
    const translatedX = point.x - centerX;
    const translatedY = point.y - centerY;
    const localX = translatedX * cosine + translatedY * sine;
    const localY = -translatedX * sine + translatedY * cosine;

    return Math.sqrt((localX * localX) / (radiusX * radiusX) + (localY * localY) / (radiusY * radiusY));
}

/**
 * Checks whether a point lies inside the given closed polygon.
 *
 * @param point Sampled cell point.
 * @param polygonPoints Polygon points in order.
 * @returns `true` when the point lies inside the polygon.
 *
 * @private helper of `asciiOctopusAvatarVisual`
 */
function isPointInsidePolygon(point: Point, polygonPoints: ReadonlyArray<Point>): boolean {
    let isInside = false;

    for (
        let currentPointIndex = 0, previousPointIndex = polygonPoints.length - 1;
        currentPointIndex < polygonPoints.length;
        previousPointIndex = currentPointIndex++
    ) {
        const currentPoint = polygonPoints[currentPointIndex]!;
        const previousPoint = polygonPoints[previousPointIndex]!;
        const isIntersecting =
            currentPoint.y > point.y !== previousPoint.y > point.y &&
            point.x <
                ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) / (previousPoint.y - currentPoint.y) +
                    currentPoint.x;

        if (isIntersecting) {
            isInside = !isInside;
        }
    }

    return isInside;
}

/**
 * Measures the shortest distance from a point to a polyline.
 *
 * @param point Sampled cell point.
 * @param polylinePoints Polyline points in order.
 * @param isClosed Whether the final point should connect back to the first point.
 * @returns Shortest distance to the polyline.
 *
 * @private helper of `asciiOctopusAvatarVisual`
 */
function getDistanceToPolyline(point: Point, polylinePoints: ReadonlyArray<Point>, isClosed: boolean): number {
    let shortestDistance = Number.POSITIVE_INFINITY;
    const segmentCount = isClosed ? polylinePoints.length : polylinePoints.length - 1;

    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex++) {
        const startPoint = polylinePoints[segmentIndex]!;
        const endPoint = polylinePoints[(segmentIndex + 1) % polylinePoints.length]!;
        shortestDistance = Math.min(shortestDistance, getDistanceToLineSegment(point, startPoint, endPoint));
    }

    return shortestDistance;
}

/**
 * Measures the shortest distance from a point to one line segment.
 *
 * @param point Sampled cell point.
 * @param startPoint Segment start point.
 * @param endPoint Segment end point.
 * @returns Shortest distance to the segment.
 *
 * @private helper of `asciiOctopusAvatarVisual`
 */
function getDistanceToLineSegment(point: Point, startPoint: Point, endPoint: Point): number {
    const deltaX = endPoint.x - startPoint.x;
    const deltaY = endPoint.y - startPoint.y;
    const segmentLengthSquared = deltaX * deltaX + deltaY * deltaY;

    if (segmentLengthSquared === 0) {
        return Math.hypot(point.x - startPoint.x, point.y - startPoint.y);
    }

    const progress = clamp01(
        ((point.x - startPoint.x) * deltaX + (point.y - startPoint.y) * deltaY) / segmentLengthSquared,
    );
    const projectionX = startPoint.x + deltaX * progress;
    const projectionY = startPoint.y + deltaY * progress;

    return Math.hypot(point.x - projectionX, point.y - projectionY);
}

/**
 * Clamps a number into the inclusive range `[0, 1]`.
 *
 * @param value Arbitrary numeric value.
 * @returns Clamped value.
 *
 * @private helper of `asciiOctopusAvatarVisual`
 */
function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
}
