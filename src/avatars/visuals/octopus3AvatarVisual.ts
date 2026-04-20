/* eslint-disable no-magic-numbers */

import { drawAvatarFrame } from '../avatarRenderingUtils';
import type { AvatarPalette, AvatarVisualDefinition } from '../types/AvatarVisualDefinition';
import type { OrganicTentacleShape } from './octopusAvatarVisualShared';
import {
    createOrganicOctopusBodyPoints,
    createOrganicOctopusTentacleShapes,
    getCubicBezierPoint,
    sampleOrganicTentacleRibbonPoints,
    traceSmoothClosedPath,
} from './octopusAvatarVisualShared';

/**
 * Octopus3 avatar visual.
 *
 * @private built-in avatar visual
 */
export const octopus3AvatarVisual: AvatarVisualDefinition = {
    id: 'octopus3',
    title: 'Octopus3',
    description: 'Gelatinous alien octopus with a morphing mantle, visible ribbon tentacles, and seeded facial features.',
    isAnimated: true,
    render({ context, size, palette, createRandom, timeMs }) {
        const staticRandom = createRandom('octopus3-static');
        const centerX = size * (0.5 + (staticRandom() - 0.5) * 0.02);
        const centerY = size * (0.41 + staticRandom() * 0.05);
        const bodyRadius = size * (0.2 + staticRandom() * 0.045);
        const horizontalStretch = 1.08 + staticRandom() * 0.22;
        const verticalStretch = 0.9 + staticRandom() * 0.12;
        const mantleLift = size * (0.105 + staticRandom() * 0.03);
        const lowerDrop = size * (0.028 + staticRandom() * 0.022);
        const tentacleDepth = size * (0.022 + staticRandom() * 0.018);
        const wobbleAmplitude = size * (0.01 + staticRandom() * 0.01);
        const lobeCount = 5 + Math.floor(staticRandom() * 3);
        const shapePhase = staticRandom() * Math.PI * 2;
        const tentacleCount = 8 + Math.floor(staticRandom() * 5);
        const eyeSpacing = size * (0.11 + staticRandom() * 0.04);
        const eyeRadiusX = size * (0.056 + staticRandom() * 0.014);
        const eyeRadiusY = eyeRadiusX * (1.18 + staticRandom() * 0.18);
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
            saltPrefix: 'octopus3',
        });

        drawAvatarFrame(context, size, palette);
        drawOctopus3Atmosphere(context, size, palette, centerX, centerY, timeMs, shapePhase);

        context.beginPath();
        context.ellipse(centerX, centerY + size * 0.25, size * 0.24, size * 0.08, 0, 0, Math.PI * 2);
        context.fillStyle = `${palette.shadow}33`;
        context.fill();

        for (const tentacleShape of tentacleShapes) {
            drawTentacleRibbon(context, tentacleShape, palette);
        }

        context.save();
        traceSmoothClosedPath(context, bodyPoints);
        const bodyGradient = context.createRadialGradient(
            centerX - size * 0.1,
            centerY - size * 0.18,
            size * 0.04,
            centerX,
            centerY + size * 0.16,
            size * 0.54,
        );
        bodyGradient.addColorStop(0, palette.highlight);
        bodyGradient.addColorStop(0.18, palette.secondary);
        bodyGradient.addColorStop(0.55, palette.primary);
        bodyGradient.addColorStop(1, palette.shadow);
        context.fillStyle = bodyGradient;
        context.shadowColor = `${palette.shadow}aa`;
        context.shadowBlur = size * 0.08;
        context.shadowOffsetY = size * 0.02;
        context.fill();
        context.restore();

        context.save();
        traceSmoothClosedPath(context, bodyPoints);
        context.clip();

        const innerGlowGradient = context.createLinearGradient(centerX, centerY - size * 0.24, centerX, centerY + size * 0.26);
        innerGlowGradient.addColorStop(0, `${palette.highlight}66`);
        innerGlowGradient.addColorStop(0.4, `${palette.secondary}26`);
        innerGlowGradient.addColorStop(1, `${palette.shadow}00`);
        context.fillStyle = innerGlowGradient;
        context.fillRect(centerX - size * 0.36, centerY - size * 0.34, size * 0.72, size * 0.72);

        drawMantleCurrents(context, centerX, centerY, size, palette, timeMs, shapePhase);
        drawMantleNodes(context, centerX, centerY, size, palette, createRandom);
        context.restore();

        context.save();
        traceSmoothClosedPath(context, bodyPoints);
        context.strokeStyle = `${palette.highlight}73`;
        context.lineWidth = size * 0.013;
        context.stroke();
        context.restore();

        context.beginPath();
        context.ellipse(centerX, centerY - size * 0.14, size * 0.18, size * 0.062, 0, Math.PI, Math.PI * 2);
        context.fillStyle = `${palette.highlight}3d`;
        context.fill();

        drawSeededEye(
            context,
            centerX - eyeSpacing,
            centerY - size * 0.01,
            eyeRadiusX,
            eyeRadiusY,
            (staticRandom() - 0.5) * 0.28,
            palette,
            timeMs,
            shapePhase,
        );
        drawSeededEye(
            context,
            centerX + eyeSpacing,
            centerY - size * 0.01,
            eyeRadiusX,
            eyeRadiusY,
            (staticRandom() - 0.5) * 0.28,
            palette,
            timeMs,
            shapePhase + Math.PI / 4,
        );

        context.beginPath();
        context.moveTo(centerX - size * 0.07, centerY + size * 0.09);
        context.quadraticCurveTo(
            centerX,
            centerY + size * (0.14 + Math.sin(timeMs / 620 + shapePhase) * 0.016),
            centerX + size * 0.07,
            centerY + size * 0.09,
        );
        context.strokeStyle = `${palette.ink}b3`;
        context.lineWidth = size * 0.012;
        context.lineCap = 'round';
        context.stroke();
    },
};

/**
 * Draws the deep-sea glow around the Octopus3 silhouette.
 *
 * @param context Canvas 2D context.
 * @param size Canvas size in CSS pixels.
 * @param palette Derived avatar palette.
 * @param centerX Body center X coordinate.
 * @param centerY Body center Y coordinate.
 * @param timeMs Current animation time in milliseconds.
 * @param shapePhase Seed-based phase offset.
 *
 * @private helper of `octopus3AvatarVisual`
 */
function drawOctopus3Atmosphere(
    context: CanvasRenderingContext2D,
    size: number,
    palette: AvatarPalette,
    centerX: number,
    centerY: number,
    timeMs: number,
    shapePhase: number,
): void {
    const haloGradient = context.createRadialGradient(centerX, centerY - size * 0.08, size * 0.06, centerX, centerY, size * 0.62);
    haloGradient.addColorStop(0, `${palette.highlight}5c`);
    haloGradient.addColorStop(0.35, `${palette.accent}26`);
    haloGradient.addColorStop(1, `${palette.highlight}00`);
    context.fillStyle = haloGradient;
    context.fillRect(0, 0, size, size);

    const lowerGlowGradient = context.createRadialGradient(
        centerX + Math.sin(timeMs / 1600 + shapePhase) * size * 0.04,
        centerY + size * 0.2,
        size * 0.04,
        centerX,
        centerY + size * 0.2,
        size * 0.48,
    );
    lowerGlowGradient.addColorStop(0, `${palette.secondary}1f`);
    lowerGlowGradient.addColorStop(1, `${palette.secondary}00`);
    context.fillStyle = lowerGlowGradient;
    context.fillRect(0, 0, size, size);
}

/**
 * Draws one ribbon tentacle with a filled organic profile and visible sucker highlights.
 *
 * @param context Canvas 2D context.
 * @param tentacleShape Deterministic tentacle descriptor.
 * @param palette Derived avatar palette.
 *
 * @private helper of `octopus3AvatarVisual`
 */
function drawTentacleRibbon(
    context: CanvasRenderingContext2D,
    tentacleShape: OrganicTentacleShape,
    palette: AvatarPalette,
): void {
    const ribbonPoints = sampleOrganicTentacleRibbonPoints(tentacleShape);
    const gradient = context.createLinearGradient(
        tentacleShape.startPoint.x,
        tentacleShape.startPoint.y,
        tentacleShape.endPoint.x,
        tentacleShape.endPoint.y,
    );

    gradient.addColorStop(0, tentacleShape.colorBias < 0.35 ? palette.secondary : palette.primary);
    gradient.addColorStop(0.58, palette.primary);
    gradient.addColorStop(1, tentacleShape.colorBias > 0.65 ? palette.highlight : palette.accent);

    context.save();
    traceTentacleRibbonPath(context, ribbonPoints);
    context.fillStyle = gradient;
    context.shadowColor = `${palette.shadow}80`;
    context.shadowBlur = tentacleShape.baseWidth * 1.2;
    context.shadowOffsetY = tentacleShape.baseWidth * 0.2;
    context.fill();
    context.restore();

    context.save();
    traceTentacleRibbonPath(context, ribbonPoints);
    context.strokeStyle = tentacleShape.highlightBias > 0.5 ? `${palette.highlight}52` : `${palette.highlight}38`;
    context.lineWidth = Math.max(1, tentacleShape.baseWidth * 0.12);
    context.stroke();
    context.restore();

    context.beginPath();
    context.moveTo(tentacleShape.startPoint.x, tentacleShape.startPoint.y);
    context.bezierCurveTo(
        tentacleShape.controlPointOne.x,
        tentacleShape.controlPointOne.y,
        tentacleShape.controlPointTwo.x,
        tentacleShape.controlPointTwo.y,
        tentacleShape.endPoint.x,
        tentacleShape.endPoint.y,
    );
    context.strokeStyle = `${palette.highlight}2e`;
    context.lineWidth = Math.max(1, tentacleShape.tipWidth * 0.9);
    context.lineCap = 'round';
    context.stroke();

    drawTentacleSuckers(context, tentacleShape, palette);
}

/**
 * Traces a closed ribbon path from sampled tentacle points.
 *
 * @param context Canvas 2D context.
 * @param ribbonPoints Sampled ribbon points.
 *
 * @private helper of `octopus3AvatarVisual`
 */
function traceTentacleRibbonPath(
    context: CanvasRenderingContext2D,
    ribbonPoints: ReadonlyArray<{
        x: number;
        y: number;
        normalX: number;
        normalY: number;
        width: number;
    }>,
): void {
    const firstRibbonPoint = ribbonPoints[0]!;

    context.beginPath();
    context.moveTo(
        firstRibbonPoint.x + firstRibbonPoint.normalX * firstRibbonPoint.width,
        firstRibbonPoint.y + firstRibbonPoint.normalY * firstRibbonPoint.width,
    );

    for (const ribbonPoint of ribbonPoints.slice(1)) {
        context.lineTo(
            ribbonPoint.x + ribbonPoint.normalX * ribbonPoint.width,
            ribbonPoint.y + ribbonPoint.normalY * ribbonPoint.width,
        );
    }

    for (const ribbonPoint of [...ribbonPoints].reverse()) {
        context.lineTo(
            ribbonPoint.x - ribbonPoint.normalX * ribbonPoint.width,
            ribbonPoint.y - ribbonPoint.normalY * ribbonPoint.width,
        );
    }

    context.closePath();
}

/**
 * Draws a row of soft sucker highlights along one side of the ribbon tentacle.
 *
 * @param context Canvas 2D context.
 * @param tentacleShape Deterministic tentacle descriptor.
 * @param palette Derived avatar palette.
 *
 * @private helper of `octopus3AvatarVisual`
 */
function drawTentacleSuckers(
    context: CanvasRenderingContext2D,
    tentacleShape: OrganicTentacleShape,
    palette: AvatarPalette,
): void {
    const undersideDirection = tentacleShape.endPoint.x >= tentacleShape.startPoint.x ? -1 : 1;

    for (let suckerIndex = 0; suckerIndex < 4; suckerIndex++) {
        const progress = 0.22 + suckerIndex * 0.17;
        const point = getCubicBezierPoint(
            tentacleShape.startPoint,
            tentacleShape.controlPointOne,
            tentacleShape.controlPointTwo,
            tentacleShape.endPoint,
            progress,
        );
        const previousPoint = getCubicBezierPoint(
            tentacleShape.startPoint,
            tentacleShape.controlPointOne,
            tentacleShape.controlPointTwo,
            tentacleShape.endPoint,
            Math.max(0, progress - 0.03),
        );
        const nextPoint = getCubicBezierPoint(
            tentacleShape.startPoint,
            tentacleShape.controlPointOne,
            tentacleShape.controlPointTwo,
            tentacleShape.endPoint,
            Math.min(1, progress + 0.03),
        );
        const tangentX = nextPoint.x - previousPoint.x;
        const tangentY = nextPoint.y - previousPoint.y;
        const tangentLength = Math.hypot(tangentX, tangentY) || 1;
        const normalX = (-tangentY / tangentLength) * undersideDirection;
        const normalY = (tangentX / tangentLength) * undersideDirection;
        const width =
            tentacleShape.baseWidth +
            (tentacleShape.tipWidth - tentacleShape.baseWidth) * Math.pow(progress, 1.1);
        const suckerX = point.x + normalX * width * 0.52;
        const suckerY = point.y + normalY * width * 0.52;
        const rotation = Math.atan2(normalY, normalX);

        context.beginPath();
        context.ellipse(suckerX, suckerY, width * 0.22, width * 0.11, rotation, 0, Math.PI * 2);
        context.fillStyle = `${palette.highlight}73`;
        context.fill();
        context.strokeStyle = `${palette.highlight}99`;
        context.lineWidth = Math.max(1, width * 0.08);
        context.stroke();
    }
}

/**
 * Draws slow inner currents inside the clipped Octopus3 mantle.
 *
 * @param context Canvas 2D context.
 * @param centerX Body center X coordinate.
 * @param centerY Body center Y coordinate.
 * @param size Canvas size in CSS pixels.
 * @param palette Derived avatar palette.
 * @param timeMs Current animation time in milliseconds.
 * @param shapePhase Seed-based phase offset.
 *
 * @private helper of `octopus3AvatarVisual`
 */
function drawMantleCurrents(
    context: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    size: number,
    palette: AvatarPalette,
    timeMs: number,
    shapePhase: number,
): void {
    for (let currentIndex = 0; currentIndex < 6; currentIndex++) {
        const horizontalOffset = (currentIndex - 2.5) * size * 0.06;
        const sway = Math.sin(timeMs / 680 + currentIndex * 0.78 + shapePhase) * size * 0.024;

        context.beginPath();
        context.moveTo(centerX + horizontalOffset * 0.3, centerY - size * 0.13);
        context.bezierCurveTo(
            centerX + horizontalOffset - sway * 0.25,
            centerY - size * 0.04,
            centerX + horizontalOffset + sway,
            centerY + size * 0.06,
            centerX + horizontalOffset * 0.7 + sway * 0.46,
            centerY + size * 0.2,
        );
        context.strokeStyle = currentIndex % 2 === 0 ? `${palette.highlight}30` : `${palette.accent}26`;
        context.lineWidth = size * (0.008 + currentIndex * 0.0007);
        context.lineCap = 'round';
        context.stroke();
    }
}

/**
 * Draws seeded luminous nodes inside the Octopus3 mantle.
 *
 * @param context Canvas 2D context.
 * @param centerX Body center X coordinate.
 * @param centerY Body center Y coordinate.
 * @param size Canvas size in CSS pixels.
 * @param palette Derived avatar palette.
 * @param createRandom Seeded random factory scoped to the avatar.
 *
 * @private helper of `octopus3AvatarVisual`
 */
function drawMantleNodes(
    context: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    size: number,
    palette: AvatarPalette,
    createRandom: (salt: string) => () => number,
): void {
    for (let nodeIndex = 0; nodeIndex < 5; nodeIndex++) {
        const nodeRandom = createRandom(`octopus3-node-${nodeIndex}`);
        const nodeX = centerX + (nodeRandom() - 0.5) * size * 0.28;
        const nodeY = centerY - size * 0.03 + (nodeRandom() - 0.5) * size * 0.2;
        const nodeRadius = size * (0.016 + nodeRandom() * 0.016);

        context.beginPath();
        context.arc(nodeX, nodeY, nodeRadius, 0, Math.PI * 2);
        context.fillStyle = nodeIndex % 2 === 0 ? `${palette.highlight}40` : `${palette.accent}33`;
        context.fill();
    }
}

/**
 * Draws one expressive seeded eye with a slit pupil and slightly tilted eyelids.
 *
 * @param context Canvas 2D context.
 * @param centerX Eye center X coordinate.
 * @param centerY Eye center Y coordinate.
 * @param radiusX Eye horizontal radius.
 * @param radiusY Eye vertical radius.
 * @param rotation Eye rotation in radians.
 * @param palette Derived avatar palette.
 * @param timeMs Current animation time in milliseconds.
 * @param phase Seed-based animation phase.
 *
 * @private helper of `octopus3AvatarVisual`
 */
function drawSeededEye(
    context: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    palette: AvatarPalette,
    timeMs: number,
    phase: number,
): void {
    const pupilOffsetX = Math.sin(timeMs / 1280 + phase) * radiusX * 0.12;
    const pupilOffsetY = Math.cos(timeMs / 940 + phase) * radiusY * 0.08;

    context.save();
    context.translate(centerX, centerY);
    context.rotate(rotation);
    context.beginPath();
    context.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
    context.fillStyle = '#f8fbff';
    context.fill();
    context.clip();

    const irisGradient = context.createRadialGradient(-radiusX * 0.18, -radiusY * 0.24, radiusX * 0.05, 0, 0, radiusX * 0.92);
    irisGradient.addColorStop(0, palette.highlight);
    irisGradient.addColorStop(0.58, palette.secondary);
    irisGradient.addColorStop(1, palette.shadow);
    context.beginPath();
    context.ellipse(pupilOffsetX, pupilOffsetY, radiusX * 0.66, radiusY * 0.74, 0, 0, Math.PI * 2);
    context.fillStyle = irisGradient;
    context.fill();

    context.beginPath();
    context.ellipse(pupilOffsetX, pupilOffsetY, radiusX * 0.14, radiusY * 0.5, 0, 0, Math.PI * 2);
    context.fillStyle = palette.ink;
    context.fill();

    context.beginPath();
    context.ellipse(pupilOffsetX - radiusX * 0.22, pupilOffsetY - radiusY * 0.24, radiusX * 0.12, radiusY * 0.14, 0, 0, Math.PI * 2);
    context.fillStyle = '#ffffff';
    context.fill();
    context.restore();

    context.save();
    context.translate(centerX, centerY);
    context.rotate(rotation);
    context.beginPath();
    context.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
    context.strokeStyle = `${palette.shadow}d9`;
    context.lineWidth = radiusX * 0.18;
    context.stroke();

    context.beginPath();
    context.moveTo(-radiusX * 0.88, -radiusY * 0.08);
    context.quadraticCurveTo(0, -radiusY * 0.9, radiusX * 0.88, -radiusY * 0.08);
    context.strokeStyle = `${palette.shadow}73`;
    context.lineWidth = radiusX * 0.16;
    context.lineCap = 'round';
    context.stroke();
    context.restore();
}
