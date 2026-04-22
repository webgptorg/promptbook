/* eslint-disable no-magic-numbers */

import { drawAvatarFrame } from '../avatarRenderingUtils';
import type { AvatarPalette, AvatarVisualDefinition } from '../types/AvatarVisualDefinition';
import {
    createOrganicOctopusBodyPoints,
    resolveOrganicEyeMotion,
    traceSmoothClosedPath,
} from './octopusAvatarVisualShared';

/**
 * Octopus2 avatar visual.
 *
 * @private built-in avatar visual
 */
export const octopus2AvatarVisual: AvatarVisualDefinition = {
    id: 'octopus2',
    title: 'Octopus2',
    description: 'Organic alien octopus rendered as one continuously morphing blob with responsive luminous eyes.',
    isAnimated: true,
    supportsPointerTracking: true,
    render({ context, size, palette, createRandom, timeMs, interaction }) {
        const staticRandom = createRandom('octopus2-static');
        const centerX = size * 0.5 + interaction.bodyOffsetX * size * 0.042;
        const centerY = size * (0.48 + staticRandom() * 0.03) + interaction.bodyOffsetY * size * 0.028;
        const bodyRadius = size * (0.25 + staticRandom() * 0.035);
        const horizontalStretch = 1.04 + staticRandom() * 0.16;
        const verticalStretch = 0.94 + staticRandom() * 0.12;
        const mantleLift = size * (0.075 + staticRandom() * 0.025);
        const lowerDrop = size * (0.05 + staticRandom() * 0.02);
        const tentacleDepth = size * (0.08 + staticRandom() * 0.03);
        const wobbleAmplitude = size * (0.014 + staticRandom() * 0.008);
        const lobeCount = 6 + Math.floor(staticRandom() * 3);
        const shapePhase = staticRandom() * Math.PI * 2;
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
        });

        drawAvatarFrame(context, size, palette);

        const hazeGradient = context.createRadialGradient(
            centerX,
            size * 0.22,
            size * 0.05,
            centerX,
            centerY,
            size * 0.6,
        );
        hazeGradient.addColorStop(0, `${palette.highlight}4d`);
        hazeGradient.addColorStop(0.45, `${palette.accent}24`);
        hazeGradient.addColorStop(1, `${palette.highlight}00`);
        context.fillStyle = hazeGradient;
        context.fillRect(0, 0, size, size);

        const rimGlowGradient = context.createRadialGradient(
            centerX,
            centerY + size * 0.08,
            size * 0.14,
            centerX,
            centerY,
            size * 0.5,
        );
        rimGlowGradient.addColorStop(0, `${palette.secondary}26`);
        rimGlowGradient.addColorStop(1, `${palette.secondary}00`);
        context.fillStyle = rimGlowGradient;
        context.fillRect(0, 0, size, size);

        context.save();
        traceSmoothClosedPath(context, bodyPoints);
        const bodyGradient = context.createRadialGradient(
            centerX - size * 0.09,
            centerY - size * 0.18,
            size * 0.06,
            centerX,
            centerY + size * 0.14,
            size * 0.5,
        );
        bodyGradient.addColorStop(0, palette.highlight);
        bodyGradient.addColorStop(0.25, palette.secondary);
        bodyGradient.addColorStop(0.68, palette.primary);
        bodyGradient.addColorStop(1, palette.shadow);
        context.fillStyle = bodyGradient;
        context.shadowColor = `${palette.shadow}aa`;
        context.shadowBlur = size * 0.08;
        context.shadowOffsetY = size * 0.018;
        context.fill();
        context.restore();

        context.save();
        traceSmoothClosedPath(context, bodyPoints);
        context.clip();

        const interiorGlowGradient = context.createLinearGradient(
            centerX,
            centerY - size * 0.22,
            centerX,
            centerY + size * 0.36,
        );
        interiorGlowGradient.addColorStop(0, `${palette.highlight}59`);
        interiorGlowGradient.addColorStop(0.45, `${palette.accent}1a`);
        interiorGlowGradient.addColorStop(1, `${palette.shadow}00`);
        context.fillStyle = interiorGlowGradient;
        context.fillRect(centerX - size * 0.36, centerY - size * 0.34, size * 0.72, size * 0.76);

        drawInteriorFilaments(context, centerX, centerY, size, palette, timeMs, shapePhase);
        drawLowerSuckers(context, centerX, centerY, size, palette, createRandom, timeMs);
        context.restore();

        context.save();
        traceSmoothClosedPath(context, bodyPoints);
        context.strokeStyle = `${palette.highlight}59`;
        context.lineWidth = size * 0.014;
        context.stroke();
        context.restore();

        const eyeOffsetX = size * 0.13;
        const eyeCenterY = centerY - size * 0.02;
        const eyeRadiusX = size * 0.072;
        const eyeRadiusY = size * 0.086;

        drawAlienEye(
            context,
            centerX - eyeOffsetX,
            eyeCenterY,
            eyeRadiusX,
            eyeRadiusY,
            palette,
            timeMs,
            shapePhase,
            interaction,
        );
        drawAlienEye(
            context,
            centerX + eyeOffsetX,
            eyeCenterY,
            eyeRadiusX,
            eyeRadiusY,
            palette,
            timeMs,
            shapePhase + Math.PI / 5,
            interaction,
        );

        context.beginPath();
        context.moveTo(centerX - size * 0.08, centerY + size * 0.12);
        context.quadraticCurveTo(
            centerX,
            centerY + size * (0.175 + Math.sin(timeMs / 520 + shapePhase) * 0.012) + interaction.gazeY * size * 0.01,
            centerX + size * 0.08,
            centerY + size * 0.12,
        );
        context.strokeStyle = `${palette.ink}b3`;
        context.lineWidth = size * 0.013;
        context.lineCap = 'round';
        context.stroke();

        context.beginPath();
        context.ellipse(centerX, centerY - size * 0.13, size * 0.16, size * 0.065, 0, Math.PI, Math.PI * 2);
        context.fillStyle = `${palette.highlight}33`;
        context.fill();
    },
};

/**
 * Draws translucent inner filaments clipped inside the main body mesh.
 *
 * @param context Canvas 2D context.
 * @param centerX Body center X coordinate.
 * @param centerY Body center Y coordinate.
 * @param size Canvas size in CSS pixels.
 * @param palette Derived avatar palette.
 * @param timeMs Current animation time in milliseconds.
 * @param shapePhase Seed-based phase offset.
 *
 * @private helper of `octopus2AvatarVisual`
 */
function drawInteriorFilaments(
    context: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    size: number,
    palette: AvatarPalette,
    timeMs: number,
    shapePhase: number,
): void {
    for (let filamentIndex = 0; filamentIndex < 5; filamentIndex++) {
        const horizontalOffset = (filamentIndex - 2) * size * 0.075;
        const sway = Math.sin(timeMs / 720 + filamentIndex * 0.8 + shapePhase) * size * 0.028;

        context.beginPath();
        context.moveTo(centerX + horizontalOffset * 0.35, centerY - size * 0.11);
        context.bezierCurveTo(
            centerX + horizontalOffset - sway * 0.35,
            centerY - size * 0.01,
            centerX + horizontalOffset + sway,
            centerY + size * 0.13,
            centerX + horizontalOffset * 0.85 + sway * 0.55,
            centerY + size * 0.3,
        );
        context.strokeStyle = filamentIndex % 2 === 0 ? `${palette.highlight}29` : `${palette.accent}24`;
        context.lineWidth = size * (0.01 + filamentIndex * 0.0008);
        context.lineCap = 'round';
        context.stroke();
    }
}

/**
 * Draws soft sucker-like highlights in the lower body area.
 *
 * @param context Canvas 2D context.
 * @param centerX Body center X coordinate.
 * @param centerY Body center Y coordinate.
 * @param size Canvas size in CSS pixels.
 * @param palette Derived avatar palette.
 * @param createRandom Seeded random factory scoped to the avatar.
 * @param timeMs Current animation time in milliseconds.
 *
 * @private helper of `octopus2AvatarVisual`
 */
function drawLowerSuckers(
    context: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    size: number,
    palette: AvatarPalette,
    createRandom: (salt: string) => () => number,
    timeMs: number,
): void {
    const suckerRandom = createRandom('octopus2-suckers');

    for (let suckerIndex = 0; suckerIndex < 12; suckerIndex++) {
        const x = centerX + (suckerRandom() - 0.5) * size * 0.36;
        const y = centerY + size * (0.11 + suckerRandom() * 0.22);
        const radiusX = size * (0.015 + suckerRandom() * 0.012);
        const radiusY = radiusX * (0.72 + suckerRandom() * 0.34);
        const rotation = suckerRandom() * Math.PI + Math.sin(timeMs / 1100 + suckerIndex) * 0.08;

        context.beginPath();
        context.ellipse(x, y, radiusX, radiusY, rotation, 0, Math.PI * 2);
        context.fillStyle = `${palette.highlight}24`;
        context.fill();
        context.strokeStyle = `${palette.highlight}40`;
        context.lineWidth = Math.max(1, size * 0.005);
        context.stroke();
    }
}

/**
 * Draws one luminous alien eye on top of the organic octopus mesh.
 *
 * @param context Canvas 2D context.
 * @param centerX Eye center X coordinate.
 * @param centerY Eye center Y coordinate.
 * @param radiusX Eye horizontal radius.
 * @param radiusY Eye vertical radius.
 * @param palette Derived avatar palette.
 * @param timeMs Current animation time in milliseconds.
 * @param phase Seed-based animation phase.
 * @param interaction Smoothed avatar interaction state.
 *
 * @private helper of `octopus2AvatarVisual`
 */
function drawAlienEye(
    context: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radiusX: number,
    radiusY: number,
    palette: AvatarPalette,
    timeMs: number,
    phase: number,
    interaction: {
        readonly gazeX: number;
        readonly gazeY: number;
        readonly intensity: number;
    },
): void {
    const { pupilOffsetX, pupilOffsetY } = resolveOrganicEyeMotion({
        radiusX,
        radiusY,
        timeMs,
        phase,
        interaction,
        autonomousDriftRatioY: 0.1,
    });

    context.save();
    context.beginPath();
    context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    context.fillStyle = '#f8fbff';
    context.fill();
    context.clip();

    const irisGradient = context.createRadialGradient(
        centerX - radiusX * 0.18,
        centerY - radiusY * 0.22,
        radiusX * 0.05,
        centerX,
        centerY,
        radiusX * 0.9,
    );
    irisGradient.addColorStop(0, palette.highlight);
    irisGradient.addColorStop(0.55, palette.secondary);
    irisGradient.addColorStop(1, palette.shadow);
    context.beginPath();
    context.ellipse(centerX + pupilOffsetX, centerY + pupilOffsetY, radiusX * 0.68, radiusY * 0.72, 0, 0, Math.PI * 2);
    context.fillStyle = irisGradient;
    context.fill();

    context.beginPath();
    context.ellipse(centerX + pupilOffsetX, centerY + pupilOffsetY, radiusX * 0.16, radiusY * 0.48, 0, 0, Math.PI * 2);
    context.fillStyle = palette.ink;
    context.fill();

    context.beginPath();
    context.ellipse(
        centerX + pupilOffsetX - radiusX * 0.18,
        centerY + pupilOffsetY - radiusY * 0.24,
        radiusX * 0.12,
        radiusY * 0.14,
        0,
        0,
        Math.PI * 2,
    );
    context.fillStyle = '#ffffff';
    context.fill();
    context.restore();

    context.beginPath();
    context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    context.strokeStyle = `${palette.shadow}cc`;
    context.lineWidth = radiusX * 0.2;
    context.stroke();
}
