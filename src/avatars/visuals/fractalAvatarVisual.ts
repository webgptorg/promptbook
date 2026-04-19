/* eslint-disable no-magic-numbers */

import { drawAvatarFrame } from '../avatarRenderingUtils';
import type { AvatarPalette, AvatarVisualDefinition } from '../types/AvatarVisualDefinition';

/**
 * One 2D point on the dragon-curve polyline.
 *
 * @private helper of `fractalAvatarVisual`
 */
type Point = {
    x: number;
    y: number;
};

/**
 * Fractal avatar visual.
 *
 * @private built-in avatar visual
 */
export const fractalAvatarVisual: AvatarVisualDefinition = {
    id: 'fractal',
    title: 'Fractal',
    description: 'Layered dragon-curve ribbons with deterministic glows, bends, and seeded color interplay.',
    isAnimated: true,
    render({ context, size, palette, createRandom, timeMs }) {
        const staticRandom = createRandom('fractal-static');
        const centerX = size * 0.5;
        const centerY = size * 0.5;
        const layerCount = 2 + Math.floor(staticRandom() * 3);
        const haloRotation = staticRandom() * Math.PI * 2;
        const colorSequence = [palette.primary, palette.secondary, palette.accent, palette.highlight];

        drawAvatarFrame(context, size, palette);
        drawFractalBackground(context, size, palette, timeMs, haloRotation);

        for (let layerIndex = 0; layerIndex < layerCount; layerIndex++) {
            const layerRandom = createRandom(`fractal-layer-${layerIndex}`);
            const order = 8 + Math.floor(layerRandom() * 4);
            const turnSequence = createDragonCurveTurns(order);
            const basePoints = createDragonCurvePoints(turnSequence);
            const transformedPoints = transformDragonCurvePoints(basePoints, {
                size,
                centerX: centerX + (layerRandom() - 0.5) * size * 0.08,
                centerY: centerY + (layerRandom() - 0.5) * size * 0.08,
                rotation:
                    layerRandom() * Math.PI * 2 +
                    Math.sin(timeMs / (1700 + layerIndex * 280) + layerIndex) * 0.14,
                scale: size * (0.19 + layerIndex * 0.055 + layerRandom() * 0.045),
                horizontalStretch: 0.74 + layerRandom() * 0.9,
                verticalStretch: 0.74 + layerRandom() * 0.9,
                warpAmplitude: size * (0.008 + layerRandom() * 0.012),
                warpPhase: layerRandom() * Math.PI * 2,
                mirrorX: layerRandom() < 0.5 ? -1 : 1,
                mirrorY: layerRandom() < 0.38 ? -1 : 1,
                timeMs,
            });
            const primaryColor = colorSequence[layerIndex % colorSequence.length]!;
            const secondaryColor = colorSequence[(layerIndex + 1) % colorSequence.length]!;
            const tertiaryColor = colorSequence[(layerIndex + 2) % colorSequence.length]!;
            const strokeWidth = size * (0.026 - layerIndex * 0.0035);

            drawDragonCurveLayer(context, transformedPoints, {
                size,
                primaryColor,
                secondaryColor,
                tertiaryColor,
                shadowColor: palette.shadow,
                strokeWidth,
                timeMs,
                layerIndex,
            });
        }

        drawFractalCore(context, size, palette, timeMs, staticRandom());
    },
};

/**
 * Draws the shared luminous atmosphere behind the curve layers.
 *
 * @param context Canvas 2D context.
 * @param size Canvas size in CSS pixels.
 * @param palette Derived avatar palette.
 * @param timeMs Current animation time in milliseconds.
 * @param haloRotation Seed-based phase offset.
 *
 * @private helper of `fractalAvatarVisual`
 */
function drawFractalBackground(
    context: CanvasRenderingContext2D,
    size: number,
    palette: AvatarPalette,
    timeMs: number,
    haloRotation: number,
): void {
    const centerX = size * 0.5;
    const centerY = size * 0.5;
    const radialGlow = context.createRadialGradient(centerX, centerY, size * 0.06, centerX, centerY, size * 0.72);
    radialGlow.addColorStop(0, `${palette.highlight}55`);
    radialGlow.addColorStop(0.4, `${palette.secondary}1f`);
    radialGlow.addColorStop(1, `${palette.highlight}00`);
    context.fillStyle = radialGlow;
    context.fillRect(0, 0, size, size);

    for (let haloIndex = 0; haloIndex < 3; haloIndex++) {
        const radius = size * (0.17 + haloIndex * 0.09);
        const rotation = haloRotation + haloIndex * 0.85 + timeMs / (4400 + haloIndex * 700);

        context.beginPath();
        context.ellipse(
            centerX,
            centerY,
            radius,
            radius * (0.62 + haloIndex * 0.06),
            rotation,
            0,
            Math.PI * 2,
        );
        context.strokeStyle = haloIndex % 2 === 0 ? `${palette.secondary}24` : `${palette.accent}20`;
        context.lineWidth = size * 0.006;
        context.stroke();
    }
}

/**
 * Generates the left-right turn sequence for a dragon curve.
 *
 * @param order Number of folding iterations.
 * @returns Turn sequence where `1` means right and `-1` means left.
 *
 * @private helper of `fractalAvatarVisual`
 */
function createDragonCurveTurns(order: number): Array<number> {
    let turns: Array<number> = [];

    for (let iteration = 0; iteration < order; iteration++) {
        turns = [...turns, 1, ...turns.slice().reverse().map((turn) => (turn === 1 ? -1 : 1))];
    }

    return turns;
}

/**
 * Converts a dragon-curve turn sequence into a raw grid polyline.
 *
 * @param turnSequence Ordered turn sequence.
 * @returns Unscaled polyline points.
 *
 * @private helper of `fractalAvatarVisual`
 */
function createDragonCurvePoints(turnSequence: ReadonlyArray<number>): Array<Point> {
    const points: Array<Point> = [{ x: 0, y: 0 }];
    const directions = [
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
        { x: 0, y: -1 },
    ];
    let directionIndex = 0;

    for (let segmentIndex = 0; segmentIndex <= turnSequence.length; segmentIndex++) {
        const currentPoint = points[points.length - 1]!;
        const direction = directions[directionIndex]!;

        points.push({
            x: currentPoint.x + direction.x,
            y: currentPoint.y + direction.y,
        });

        if (segmentIndex < turnSequence.length) {
            directionIndex = (directionIndex + turnSequence[segmentIndex]! + directions.length) % directions.length;
        }
    }

    return points;
}

/**
 * Normalizes and decorates the dragon-curve polyline for avatar rendering.
 *
 * @param points Raw grid polyline points.
 * @param options Transformation parameters.
 * @returns Transformed canvas points.
 *
 * @private helper of `fractalAvatarVisual`
 */
function transformDragonCurvePoints(
    points: ReadonlyArray<Point>,
    options: {
        size: number;
        centerX: number;
        centerY: number;
        rotation: number;
        scale: number;
        horizontalStretch: number;
        verticalStretch: number;
        warpAmplitude: number;
        warpPhase: number;
        mirrorX: number;
        mirrorY: number;
        timeMs: number;
    },
): Array<Point> {
    const { size, centerX, centerY, rotation, scale, horizontalStretch, verticalStretch, warpAmplitude, warpPhase, mirrorX, mirrorY, timeMs } =
        options;
    const bounds = getPointBounds(points);
    const width = Math.max(1, bounds.maxX - bounds.minX);
    const height = Math.max(1, bounds.maxY - bounds.minY);
    const normalizationScale = scale / Math.max(width, height);
    const cosine = Math.cos(rotation);
    const sine = Math.sin(rotation);

    return points.map((point, pointIndex) => {
        const normalizedX = (point.x - (bounds.minX + width / 2)) * normalizationScale * horizontalStretch * mirrorX;
        const normalizedY = (point.y - (bounds.minY + height / 2)) * normalizationScale * verticalStretch * mirrorY;
        const progress = pointIndex / Math.max(1, points.length - 1);
        const localWarp =
            Math.sin(progress * Math.PI * 4 + warpPhase + timeMs / 1400) * warpAmplitude +
            Math.cos(progress * Math.PI * 7 - warpPhase + timeMs / 1800) * warpAmplitude * 0.45;
        const rotatedX = normalizedX * cosine - normalizedY * sine;
        const rotatedY = normalizedX * sine + normalizedY * cosine;

        return {
            x: centerX + rotatedX + Math.sin(progress * Math.PI * 2 + warpPhase) * localWarp,
            y: centerY + rotatedY + Math.cos(progress * Math.PI * 3 + warpPhase * 0.6) * localWarp + (progress - 0.5) * size * 0.02,
        };
    });
}

/**
 * Returns the bounding box of a point cloud.
 *
 * @param points Point cloud to inspect.
 * @returns Bounding box.
 *
 * @private helper of `fractalAvatarVisual`
 */
function getPointBounds(points: ReadonlyArray<Point>): { minX: number; maxX: number; minY: number; maxY: number } {
    return points.reduce(
        (bounds, point) => ({
            minX: Math.min(bounds.minX, point.x),
            maxX: Math.max(bounds.maxX, point.x),
            minY: Math.min(bounds.minY, point.y),
            maxY: Math.max(bounds.maxY, point.y),
        }),
        {
            minX: Number.POSITIVE_INFINITY,
            maxX: Number.NEGATIVE_INFINITY,
            minY: Number.POSITIVE_INFINITY,
            maxY: Number.NEGATIVE_INFINITY,
        },
    );
}

/**
 * Draws one stylized dragon-curve ribbon with glow and spark nodes.
 *
 * @param context Canvas 2D context.
 * @param points Transformed polyline points.
 * @param options Layer styling options.
 *
 * @private helper of `fractalAvatarVisual`
 */
function drawDragonCurveLayer(
    context: CanvasRenderingContext2D,
    points: ReadonlyArray<Point>,
    options: {
        size: number;
        primaryColor: string;
        secondaryColor: string;
        tertiaryColor: string;
        shadowColor: string;
        strokeWidth: number;
        timeMs: number;
        layerIndex: number;
    },
): void {
    const { size, primaryColor, secondaryColor, tertiaryColor, shadowColor, strokeWidth, timeMs, layerIndex } = options;
    const firstPoint = points[0]!;
    const lastPoint = points[points.length - 1]!;
    const ribbonGradient = context.createLinearGradient(firstPoint.x, firstPoint.y, lastPoint.x, lastPoint.y);
    ribbonGradient.addColorStop(0, `${primaryColor}f2`);
    ribbonGradient.addColorStop(0.5, `${secondaryColor}e6`);
    ribbonGradient.addColorStop(1, `${tertiaryColor}f2`);

    context.save();
    context.beginPath();
    tracePolyline(context, points);
    context.strokeStyle = `${shadowColor}82`;
    context.lineWidth = strokeWidth * 1.8;
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.filter = `blur(${size * 0.022}px)`;
    context.stroke();
    context.restore();

    context.beginPath();
    tracePolyline(context, points);
    context.strokeStyle = ribbonGradient;
    context.lineWidth = strokeWidth;
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.stroke();

    context.beginPath();
    tracePolyline(context, points);
    context.strokeStyle = 'rgba(255,255,255,0.22)';
    context.lineWidth = Math.max(1.2, strokeWidth * 0.28);
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.stroke();

    const sparkStride = Math.max(24, Math.floor(points.length / 18));
    for (let pointIndex = sparkStride; pointIndex < points.length; pointIndex += sparkStride) {
        const point = points[pointIndex]!;
        const pulse = 0.7 + 0.3 * Math.sin(timeMs / 700 + pointIndex * 0.12 + layerIndex);
        const radius = strokeWidth * (0.24 + pulse * 0.22);

        context.beginPath();
        context.arc(point.x, point.y, radius * 1.8, 0, Math.PI * 2);
        context.fillStyle = `${secondaryColor}20`;
        context.fill();

        context.beginPath();
        context.arc(point.x, point.y, radius, 0, Math.PI * 2);
        context.fillStyle = tertiaryColor;
        context.fill();
    }
}

/**
 * Traces a polyline through the provided points.
 *
 * @param context Canvas 2D context.
 * @param points Polyline points.
 *
 * @private helper of `fractalAvatarVisual`
 */
function tracePolyline(context: CanvasRenderingContext2D, points: ReadonlyArray<Point>): void {
    const firstPoint = points[0]!;

    context.moveTo(firstPoint.x, firstPoint.y);

    for (let pointIndex = 1; pointIndex < points.length; pointIndex++) {
        const point = points[pointIndex]!;
        context.lineTo(point.x, point.y);
    }
}

/**
 * Draws the central crystalline accent tying the dragon-curve layers together.
 *
 * @param context Canvas 2D context.
 * @param size Canvas size in CSS pixels.
 * @param palette Derived avatar palette.
 * @param timeMs Current animation time in milliseconds.
 * @param corePhase Seed-based phase offset.
 *
 * @private helper of `fractalAvatarVisual`
 */
function drawFractalCore(
    context: CanvasRenderingContext2D,
    size: number,
    palette: AvatarPalette,
    timeMs: number,
    corePhase: number,
): void {
    const centerX = size * 0.5;
    const centerY = size * 0.5;
    const radius = size * 0.082;
    const rotation = corePhase * Math.PI * 2 + timeMs / 2200;
    const innerRotation = -rotation * 1.35;

    context.save();
    context.translate(centerX, centerY);
    context.rotate(rotation);
    context.beginPath();
    for (let pointIndex = 0; pointIndex < 4; pointIndex++) {
        const angle = (pointIndex / 4) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        if (pointIndex === 0) {
            context.moveTo(x, y);
        } else {
            context.lineTo(x, y);
        }
    }
    context.closePath();
    context.fillStyle = `${palette.highlight}88`;
    context.shadowColor = `${palette.highlight}77`;
    context.shadowBlur = size * 0.05;
    context.fill();
    context.restore();

    context.save();
    context.translate(centerX, centerY);
    context.rotate(innerRotation);
    context.beginPath();
    for (let pointIndex = 0; pointIndex < 4; pointIndex++) {
        const angle = Math.PI / 4 + (pointIndex / 4) * Math.PI * 2;
        const x = Math.cos(angle) * radius * 0.55;
        const y = Math.sin(angle) * radius * 0.55;

        if (pointIndex === 0) {
            context.moveTo(x, y);
        } else {
            context.lineTo(x, y);
        }
    }
    context.closePath();
    context.fillStyle = `${palette.ink}cc`;
    context.fill();
    context.restore();
}
