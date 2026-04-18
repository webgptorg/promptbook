/* eslint-disable no-magic-numbers */

import { drawAvatarFrame, pickRandomItem } from '../avatarRenderingUtils';
import type { AvatarPalette, AvatarVisualDefinition } from '../types/AvatarVisualDefinition';

/**
 * Fractal avatar visual.
 *
 * @private built-in avatar visual
 */
export const fractalAvatarVisual: AvatarVisualDefinition = {
    id: 'fractal',
    title: 'Fractal',
    description: 'Recursive crystal bloom with seed-based branches, layered glows, and a monogram core.',
    isAnimated: false,
    render({ context, size, palette, createRandom, avatarDefinition }) {
        const atmosphereRandom = createRandom('fractal-atmosphere');
        const branchLayoutRandom = createRandom('fractal-layout');
        const centerX = size * 0.5;
        const centerY = size * 0.52;
        const armCount = 5 + Math.floor(branchLayoutRandom() * 2);
        const recursionDepth = 2 + Math.floor(branchLayoutRandom() * 2);
        const branchSpread = Math.PI * (0.3 + branchLayoutRandom() * 0.1);
        const coreRadius = size * (0.13 + branchLayoutRandom() * 0.01);
        const orbitRadius = size * (0.26 + atmosphereRandom() * 0.04);
        const orbitSparkCount = 12 + Math.floor(atmosphereRandom() * 7);

        drawAvatarFrame(context, size, palette);
        drawFractalAtmosphere(context, size, centerX, centerY, orbitRadius, orbitSparkCount, palette, atmosphereRandom);

        // Build several seeded radial branches so the same identity always yields the same recursive bloom.
        for (let armIndex = 0; armIndex < armCount; armIndex++) {
            const armRandom = createRandom(`fractal-arm-${armIndex}`);
            const angle = (Math.PI * 2 * armIndex) / armCount + (armRandom() - 0.5) * 0.18;
            const branchLength = size * (0.12 + armRandom() * 0.035);

            drawFractalBranch({
                context,
                startX: centerX,
                startY: centerY,
                angle,
                length: branchLength,
                depth: recursionDepth,
                lineWidth: size * 0.025,
                branchSpread,
                palette,
                random: armRandom,
            });
        }

        drawFractalCore(context, centerX, centerY, coreRadius, palette, avatarDefinition.agentName);
    },
};

/**
 * Specification for one recursive fractal branch.
 *
 * @private helper of `fractalAvatarVisual`
 */
type FractalBranch = {
    context: CanvasRenderingContext2D;
    startX: number;
    startY: number;
    angle: number;
    length: number;
    depth: number;
    lineWidth: number;
    branchSpread: number;
    palette: AvatarPalette;
    random: () => number;
};

/**
 * Paints the soft background glow and orbit sparks behind the fractal.
 *
 * @param context Canvas 2D context.
 * @param size Canvas size in CSS pixels.
 * @param centerX Fractal center X coordinate.
 * @param centerY Fractal center Y coordinate.
 * @param orbitRadius Radius of the spark orbit.
 * @param orbitSparkCount Number of background sparks.
 * @param palette Derived avatar palette.
 * @param random Seeded random generator.
 *
 * @private helper of `fractalAvatarVisual`
 */
function drawFractalAtmosphere(
    context: CanvasRenderingContext2D,
    size: number,
    centerX: number,
    centerY: number,
    orbitRadius: number,
    orbitSparkCount: number,
    palette: AvatarPalette,
    random: () => number,
): void {
    const glow = context.createRadialGradient(centerX, centerY - size * 0.16, size * 0.03, centerX, centerY, size * 0.6);
    glow.addColorStop(0, `${palette.highlight}66`);
    glow.addColorStop(0.4, `${palette.accent}22`);
    glow.addColorStop(1, `${palette.highlight}00`);
    context.fillStyle = glow;
    context.fillRect(0, 0, size, size);

    for (let sparkIndex = 0; sparkIndex < orbitSparkCount; sparkIndex++) {
        const angle = (Math.PI * 2 * sparkIndex) / orbitSparkCount + random() * 0.45;
        const distance = orbitRadius * (0.72 + random() * 0.38);
        const radius = size * (0.006 + random() * 0.01);
        const x = centerX + Math.cos(angle) * distance;
        const y = centerY + Math.sin(angle) * distance;

        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fillStyle = pickRandomItem(
            [`${palette.highlight}aa`, `${palette.secondary}88`, `${palette.accent}99`, 'rgba(255,255,255,0.34)'],
            random,
        );
        context.fill();
    }
}

/**
 * Draws one recursive fractal branch with deterministic child offshoots.
 *
 * @param fractalBranch Recursive branch configuration.
 *
 * @private helper of `fractalAvatarVisual`
 */
function drawFractalBranch(fractalBranch: FractalBranch): void {
    const { context, startX, startY, angle, length, depth, lineWidth, branchSpread, palette, random } = fractalBranch;
    const perpendicularAngle = angle + Math.PI / 2;
    const curveOffset = (random() - 0.5) * length * 0.32;
    const endX = startX + Math.cos(angle) * length;
    const endY = startY + Math.sin(angle) * length;
    const controlX = startX + Math.cos(angle) * length * 0.52 + Math.cos(perpendicularAngle) * curveOffset;
    const controlY = startY + Math.sin(angle) * length * 0.52 + Math.sin(perpendicularAngle) * curveOffset;
    const branchColor = pickRandomItem([palette.primary, palette.secondary, palette.accent, palette.highlight], random);

    context.save();
    context.beginPath();
    context.moveTo(startX, startY);
    context.quadraticCurveTo(controlX, controlY, endX, endY);
    context.strokeStyle = createBranchGradient(context, startX, startY, endX, endY, branchColor, palette);
    context.lineWidth = lineWidth;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.shadowColor = `${palette.shadow}55`;
    context.shadowBlur = lineWidth * 1.6;
    context.stroke();
    context.restore();

    context.beginPath();
    context.arc(endX, endY, Math.max(lineWidth * 0.35, 1.4), 0, Math.PI * 2);
    context.fillStyle = pickRandomItem([palette.highlight, palette.accent, '#ffffff'], random);
    context.fill();

    if (depth <= 0) {
        return;
    }

    const childCount = 2 + Math.floor(random() * 2);

    // Reusing one seeded generator per arm keeps the full recursive tree stable without managing child seeds manually.
    for (let childIndex = 0; childIndex < childCount; childIndex++) {
        const normalizedOffset = childCount === 1 ? 0 : childIndex / (childCount - 1) - 0.5;
        const childAngle = angle + normalizedOffset * branchSpread + (random() - 0.5) * 0.22;
        const childLength = length * (0.54 + random() * 0.12);

        drawFractalBranch({
            context,
            startX: endX,
            startY: endY,
            angle: childAngle,
            length: childLength,
            depth: depth - 1,
            lineWidth: lineWidth * 0.72,
            branchSpread: branchSpread * 0.88,
            palette,
            random,
        });
    }

    if (depth > 1 && random() < 0.55) {
        const midpointT = 0.38 + random() * 0.18;
        const midpointX =
            (1 - midpointT) * (1 - midpointT) * startX +
            2 * (1 - midpointT) * midpointT * controlX +
            midpointT * midpointT * endX;
        const midpointY =
            (1 - midpointT) * (1 - midpointT) * startY +
            2 * (1 - midpointT) * midpointT * controlY +
            midpointT * midpointT * endY;
        const mirroredAngle = angle + (random() < 0.5 ? -1 : 1) * branchSpread * (0.45 + random() * 0.16);

        drawFractalBranch({
            context,
            startX: midpointX,
            startY: midpointY,
            angle: mirroredAngle,
            length: length * (0.42 + random() * 0.08),
            depth: depth - 2,
            lineWidth: lineWidth * 0.56,
            branchSpread: branchSpread * 0.74,
            palette,
            random,
        });
    }
}

/**
 * Creates a soft gradient for a single branch stroke.
 *
 * @param context Canvas 2D context.
 * @param startX Branch start X coordinate.
 * @param startY Branch start Y coordinate.
 * @param endX Branch end X coordinate.
 * @param endY Branch end Y coordinate.
 * @param branchColor Main branch color.
 * @param palette Derived avatar palette.
 * @returns Stroke gradient.
 *
 * @private helper of `fractalAvatarVisual`
 */
function createBranchGradient(
    context: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    branchColor: string,
    palette: AvatarPalette,
): CanvasGradient {
    const gradient = context.createLinearGradient(startX, startY, endX, endY);
    gradient.addColorStop(0, `${palette.highlight}33`);
    gradient.addColorStop(0.4, branchColor);
    gradient.addColorStop(1, `${palette.shadow}aa`);
    return gradient;
}

/**
 * Draws the bright monogram core at the center of the fractal.
 *
 * @param context Canvas 2D context.
 * @param centerX Core center X coordinate.
 * @param centerY Core center Y coordinate.
 * @param radius Core radius.
 * @param palette Derived avatar palette.
 * @param agentName Agent name used for the monogram.
 *
 * @private helper of `fractalAvatarVisual`
 */
function drawFractalCore(
    context: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number,
    palette: AvatarPalette,
    agentName: string,
): void {
    const coreGradient = context.createRadialGradient(
        centerX - radius * 0.28,
        centerY - radius * 0.36,
        radius * 0.18,
        centerX,
        centerY,
        radius,
    );
    coreGradient.addColorStop(0, '#ffffff');
    coreGradient.addColorStop(0.36, palette.highlight);
    coreGradient.addColorStop(0.72, palette.accent);
    coreGradient.addColorStop(1, palette.shadow);

    context.save();
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.fillStyle = coreGradient;
    context.shadowColor = `${palette.highlight}77`;
    context.shadowBlur = radius * 0.8;
    context.fill();
    context.restore();

    context.beginPath();
    context.arc(centerX, centerY, radius * 1.16, 0, Math.PI * 2);
    context.strokeStyle = 'rgba(255,255,255,0.22)';
    context.lineWidth = radius * 0.16;
    context.stroke();

    context.fillStyle = palette.ink;
    context.font = `600 ${Math.round(radius * 0.95)}px sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(agentName.charAt(0).toUpperCase() || '?', centerX, centerY + radius * 0.05);
}
