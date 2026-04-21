/* eslint-disable no-magic-numbers */

import { drawAvatarFrame, pickRandomItem } from '../avatarRenderingUtils';
import type { AvatarVisualDefinition } from '../types/AvatarVisualDefinition';
import { resolveOrganicEyeMotion } from './octopusAvatarVisualShared';

/**
 * Octopus avatar visual.
 *
 * @private built-in avatar visual
 */
export const octopusAvatarVisual: AvatarVisualDefinition = {
    id: 'octopus',
    title: 'Octopus',
    description: 'Playful underwater mascot with cursor-following eyes, animated tentacles, bubbles, and seeded markings.',
    isAnimated: true,
    supportsPointerTracking: true,
    render({ context, size, palette, createRandom, timeMs, interaction }) {
        const staticRandom = createRandom('octopus-static');
        const bubbleRandom = createRandom('octopus-bubbles');
        const bubbleCount = 8;
        const bubbleRadiusBase = size * 0.02;
        const centerX = size * 0.5 + interaction.bodyOffsetX * size * 0.035;
        const centerY = size * 0.42 + interaction.bodyOffsetY * size * 0.024;
        const headRadius = size * (0.19 + staticRandom() * 0.03);
        const mantleHeight = headRadius * 1.18;
        const tentacleLength = size * (0.18 + staticRandom() * 0.06);
        const tentaclePhases = Array.from({ length: 8 }, () => staticRandom() * Math.PI * 2);
        const spotCount = 3 + Math.floor(staticRandom() * 4);
        const spotColors = [palette.secondary, palette.accent, palette.highlight];

        drawAvatarFrame(context, size, palette);

        const waterGlow = context.createRadialGradient(centerX, size * 0.22, size * 0.06, centerX, size * 0.22, size * 0.58);
        waterGlow.addColorStop(0, `${palette.highlight}66`);
        waterGlow.addColorStop(1, `${palette.highlight}00`);
        context.fillStyle = waterGlow;
        context.fillRect(0, 0, size, size);

        for (let bubbleIndex = 0; bubbleIndex < bubbleCount; bubbleIndex++) {
            const x = size * (0.15 + bubbleRandom() * 0.7);
            const y = size * (0.12 + bubbleRandom() * 0.68);
            const radius = bubbleRadiusBase * (0.6 + bubbleRandom() * 2.3);

            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fillStyle = 'rgba(255,255,255,0.08)';
            context.fill();
            context.beginPath();
            context.arc(x - radius * 0.22, y - radius * 0.22, radius * 0.25, 0, Math.PI * 2);
            context.fillStyle = 'rgba(255,255,255,0.28)';
            context.fill();
        }

        for (let tentacleIndex = 0; tentacleIndex < 8; tentacleIndex++) {
            const startX = centerX + (tentacleIndex - 3.5) * headRadius * 0.19;
            const startY = centerY + headRadius * 0.62;
            const animationPhase = tentaclePhases[tentacleIndex]!;
            const sway = Math.sin(timeMs / 520 + animationPhase) * size * 0.03;
            const endX = startX + (tentacleIndex - 3.5) * size * 0.025 + sway;
            const endY = startY + tentacleLength + Math.cos(timeMs / 700 + animationPhase) * size * 0.01;
            const controlX = (startX + endX) / 2 + sway * 0.8;
            const controlY = startY + tentacleLength * 0.45;
            const lineWidth = size * (0.042 - tentacleIndex * 0.0022);

            context.beginPath();
            context.moveTo(startX, startY);
            context.quadraticCurveTo(controlX, controlY, endX, endY);
            context.lineCap = 'round';
            context.strokeStyle = palette.primary;
            context.lineWidth = lineWidth;
            context.stroke();

            for (let cupIndex = 1; cupIndex <= 3; cupIndex++) {
                const cupT = cupIndex / 4;
                const cupX =
                    (1 - cupT) * (1 - cupT) * startX + 2 * (1 - cupT) * cupT * controlX + cupT * cupT * endX;
                const cupY =
                    (1 - cupT) * (1 - cupT) * startY + 2 * (1 - cupT) * cupT * controlY + cupT * cupT * endY;

                context.beginPath();
                context.arc(cupX, cupY, lineWidth * 0.18, 0, Math.PI * 2);
                context.fillStyle = `${palette.highlight}cc`;
                context.fill();
            }
        }

        context.save();
        context.fillStyle = palette.primary;
        context.shadowColor = `${palette.shadow}88`;
        context.shadowBlur = size * 0.08;
        context.beginPath();
        context.ellipse(centerX, centerY, headRadius, mantleHeight, 0, Math.PI, 0, true);
        context.lineTo(centerX + headRadius, centerY);
        context.ellipse(centerX, centerY, headRadius, headRadius * 0.82, 0, 0, Math.PI);
        context.closePath();
        context.fill();
        context.restore();

        context.beginPath();
        context.ellipse(centerX, centerY - headRadius * 0.22, headRadius * 0.74, headRadius * 0.42, 0, Math.PI, Math.PI * 2);
        context.fillStyle = `${palette.highlight}55`;
        context.fill();

        for (let spotIndex = 0; spotIndex < spotCount; spotIndex++) {
            const spotRandom = createRandom(`octopus-spot-${spotIndex}`);
            const spotX = centerX + (spotRandom() - 0.5) * headRadius * 1.1;
            const spotY = centerY - headRadius * 0.05 + (spotRandom() - 0.5) * headRadius * 0.9;
            const spotRadius = headRadius * (0.07 + spotRandom() * 0.07);

            context.beginPath();
            context.arc(spotX, spotY, spotRadius, 0, Math.PI * 2);
            context.fillStyle = pickRandomItem(spotColors, spotRandom);
            context.fill();
        }

        const eyeOffsetX = headRadius * 0.42;
        const eyeY = centerY + headRadius * 0.04;
        const eyeRadius = headRadius * 0.22;

        drawEye(context, centerX - eyeOffsetX, eyeY, eyeRadius, palette, timeMs, interaction, 0);
        drawEye(context, centerX + eyeOffsetX, eyeY, eyeRadius, palette, timeMs, interaction, Math.PI / 5);

        context.beginPath();
        context.arc(centerX - headRadius * 0.28, centerY + headRadius * 0.3, headRadius * 0.12, 0, Math.PI * 2);
        context.arc(centerX + headRadius * 0.28, centerY + headRadius * 0.3, headRadius * 0.12, 0, Math.PI * 2);
        context.fillStyle = `${palette.accent}44`;
        context.fill();

        context.beginPath();
        context.moveTo(centerX - headRadius * 0.18, centerY + headRadius * 0.24);
        context.quadraticCurveTo(centerX, centerY + headRadius * 0.42, centerX + headRadius * 0.18, centerY + headRadius * 0.24);
        context.strokeStyle = palette.shadow;
        context.lineWidth = size * 0.016;
        context.lineCap = 'round';
        context.stroke();
    },
};

/**
 * Draws one expressive octopus eye.
 *
 * @param context Canvas 2D context.
 * @param centerX Eye center X coordinate.
 * @param centerY Eye center Y coordinate.
 * @param radius Eye radius.
 * @param palette Derived avatar palette.
 * @param timeMs Current animation time in milliseconds.
 * @param interaction Smoothed avatar interaction state.
 * @param phase Seed-based phase offset.
 *
 * @private helper of `octopusAvatarVisual`
 */
function drawEye(
    context: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number,
    palette: { ink: string; shadow: string },
    timeMs: number,
    interaction: {
        readonly gazeX: number;
        readonly gazeY: number;
        readonly intensity: number;
    },
    phase: number,
): void {
    const { pupilOffsetX, pupilOffsetY } = resolveOrganicEyeMotion({
        radiusX: radius,
        radiusY: radius,
        timeMs,
        phase,
        interaction,
        autonomousDriftRatioX: 0.05,
        autonomousDriftRatioY: 0.03,
    });

    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.fillStyle = '#ffffff';
    context.fill();

    context.beginPath();
    context.arc(centerX + pupilOffsetX, centerY + pupilOffsetY, radius * 0.45, 0, Math.PI * 2);
    context.fillStyle = palette.ink;
    context.fill();

    context.beginPath();
    context.arc(
        centerX + pupilOffsetX - radius * 0.12,
        centerY + pupilOffsetY - radius * 0.12,
        radius * 0.15,
        0,
        Math.PI * 2,
    );
    context.fillStyle = '#ffffff';
    context.fill();

    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.strokeStyle = palette.shadow;
    context.lineWidth = radius * 0.18;
    context.stroke();
}
