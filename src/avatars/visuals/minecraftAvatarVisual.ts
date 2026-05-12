/* eslint-disable no-magic-numbers */

import { createRoundedRectPath, drawAvatarFrame } from '../avatarRenderingUtils';
import type { AvatarVisualDefinition } from '../types/AvatarVisualDefinition';
import { createMinecraftHeadTextures, createMinecraftTorsoTextures } from './minecraftAvatarVisualShared';

/**
 * Minecraft-style 3D avatar visual.
 *
 * @private built-in avatar visual
 */
export const minecraftAvatarVisual: AvatarVisualDefinition = {
    id: 'minecraft',
    title: 'Minecraft 3D',
    description: 'Blocky 3D portrait with deterministic pixel textures, shoulders, and hovering depth.',
    isAnimated: true,
    render({ context, size, palette, createRandom, timeMs }) {
        const random = createRandom('minecraft');
        const bob = Math.sin(timeMs / 880) * size * 0.015;
        const headSize = size * 0.34;
        const depth = headSize * 0.22;
        const headX = size * 0.31;
        const headY = size * 0.18 + bob;
        const bodyWidth = headSize * 0.86;
        const bodyHeight = headSize * 0.82;
        const bodyDepth = depth * 0.8;
        const bodyX = size * 0.33;
        const bodyY = headY + headSize * 0.96;
        const hasHeadband = random() < 0.5;
        const headTextures = createMinecraftHeadTextures(createRandom('minecraft-face'), palette, hasHeadband);
        const torsoTextures = createMinecraftTorsoTextures(createRandom('minecraft-shirt'), palette);

        drawAvatarFrame(context, size, palette);

        const spotlight = context.createRadialGradient(
            size * 0.5,
            size * 0.18,
            size * 0.05,
            size * 0.5,
            size * 0.18,
            size * 0.5,
        );
        spotlight.addColorStop(0, `${palette.highlight}66`);
        spotlight.addColorStop(1, `${palette.highlight}00`);
        context.fillStyle = spotlight;
        context.fillRect(0, 0, size, size);

        context.save();
        context.fillStyle = 'rgba(0, 0, 0, 0.22)';
        context.filter = `blur(${size * 0.018}px)`;
        context.beginPath();
        context.ellipse(size * 0.5, size * 0.86, size * 0.2, size * 0.06, 0, 0, Math.PI * 2);
        context.fill();
        context.restore();

        drawVoxelCuboid(context, {
            x: bodyX,
            y: bodyY,
            width: bodyWidth,
            height: bodyHeight,
            depth: bodyDepth,
            frontTexture: torsoTextures.front,
            topColor: `${palette.highlight}cc`,
            sideColor: `${palette.secondary}dd`,
            outlineColor: `${palette.shadow}aa`,
        });

        drawVoxelCuboid(context, {
            x: headX,
            y: headY,
            width: headSize,
            height: headSize,
            depth,
            frontTexture: headTextures.front,
            topColor: `${palette.highlight}ee`,
            sideColor: `${palette.secondary}ee`,
            outlineColor: `${palette.shadow}cc`,
        });
    },
};

/**
 * One voxel cuboid projection specification.
 *
 * @private helper of `minecraftAvatarVisual`
 */
type VoxelCuboid = {
    x: number;
    y: number;
    width: number;
    height: number;
    depth: number;
    frontTexture: ReadonlyArray<ReadonlyArray<string>>;
    topColor: string;
    sideColor: string;
    outlineColor: string;
};

/**
 * Draws a stylized voxel cuboid with a front pixel texture.
 *
 * @param context Canvas 2D context.
 * @param cuboid Cuboid settings.
 *
 * @private helper of `minecraftAvatarVisual`
 */
function drawVoxelCuboid(context: CanvasRenderingContext2D, cuboid: VoxelCuboid): void {
    const { x, y, width, height, depth, frontTexture, topColor, sideColor, outlineColor } = cuboid;
    const lift = depth * 0.6;

    context.save();
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + depth, y - lift);
    context.lineTo(x + width + depth, y - lift);
    context.lineTo(x + width, y);
    context.closePath();
    context.fillStyle = topColor;
    context.fill();
    context.restore();

    context.save();
    context.beginPath();
    context.moveTo(x + width, y);
    context.lineTo(x + width + depth, y - lift);
    context.lineTo(x + width + depth, y + height - lift);
    context.lineTo(x + width, y + height);
    context.closePath();
    context.fillStyle = sideColor;
    context.fill();
    context.restore();

    const rows = frontTexture.length;
    const columns = frontTexture[0]?.length || 0;
    const pixelWidth = width / Math.max(columns, 1);
    const pixelHeight = height / Math.max(rows, 1);

    context.save();
    createRoundedRectPath(context, x, y, width, height, width * 0.03);
    context.clip();

    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
        for (let columnIndex = 0; columnIndex < columns; columnIndex++) {
            context.fillStyle = frontTexture[rowIndex]![columnIndex]!;
            context.fillRect(x + columnIndex * pixelWidth, y + rowIndex * pixelHeight, pixelWidth, pixelHeight);
        }
    }

    context.restore();

    context.strokeStyle = outlineColor;
    context.lineWidth = Math.max(1.2, width * 0.025);

    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + depth, y - lift);
    context.lineTo(x + width + depth, y - lift);
    context.lineTo(x + width + depth, y + height - lift);
    context.lineTo(x + width, y + height);
    context.lineTo(x, y + height);
    context.closePath();
    context.stroke();
}
