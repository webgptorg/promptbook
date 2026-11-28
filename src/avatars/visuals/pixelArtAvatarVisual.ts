/* eslint-disable no-magic-numbers */

import { createRoundedRectPath, drawAvatarFrame } from '../avatarRenderingUtils';
import type { AvatarVisualDefinition } from '../types/AvatarVisualDefinition';

/**
 * Pixel-art avatar visual.
 *
 * @private built-in avatar visual
 */
export const pixelArtAvatarVisual: AvatarVisualDefinition = {
    id: 'pixel-art',
    title: 'Pixel art',
    description: 'Symmetric retro badge with a deterministic face and palette-driven pixels.',
    isAnimated: false,
    render({ context, size, palette, createRandom, avatarDefinition }) {
        const random = createRandom('pixel-art');
        const panelSize = size * 0.62;
        const panelX = (size - panelSize) / 2;
        const panelY = size * 0.19;
        const pixelGridSize = 10;
        const pixelSize = panelSize / pixelGridSize;
        const halfColumns = Math.ceil(pixelGridSize / 2);
        const colorStops = [palette.primary, palette.secondary, palette.accent, palette.highlight];
        const foreheadRowCount = 2 + Math.floor(random() * 2);
        const cheekInset = 1 + Math.floor(random() * 2);
        const emblemHeight = 2 + Math.floor(random() * 2);

        drawAvatarFrame(context, size, palette);

        const glow = context.createRadialGradient(
            size * 0.5,
            size * 0.32,
            size * 0.05,
            size * 0.5,
            size * 0.32,
            size * 0.5,
        );
        glow.addColorStop(0, `${palette.highlight}aa`);
        glow.addColorStop(1, `${palette.highlight}00`);
        context.fillStyle = glow;
        context.fillRect(0, 0, size, size);

        context.save();
        createRoundedRectPath(context, panelX, panelY, panelSize, panelSize, panelSize * 0.16);
        context.fillStyle = palette.shadow;
        context.shadowColor = `${palette.shadow}66`;
        context.shadowBlur = size * 0.08;
        context.fill();
        context.restore();

        for (let rowIndex = 0; rowIndex < pixelGridSize; rowIndex++) {
            for (let columnIndex = 0; columnIndex < halfColumns; columnIndex++) {
                const mirroredColumnIndex = pixelGridSize - columnIndex - 1;
                const normalizedRowDistance = Math.abs(rowIndex - pixelGridSize / 2) / (pixelGridSize / 2);
                const normalizedColumnDistance = columnIndex / halfColumns;
                const fillChance = 0.85 - normalizedRowDistance * 0.32 - normalizedColumnDistance * 0.08;

                if (random() > fillChance) {
                    continue;
                }

                const color =
                    colorStops[
                        Math.min(
                            colorStops.length - 1,
                            Math.floor(
                                random() *
                                    (rowIndex < foreheadRowCount
                                        ? 2
                                        : rowIndex > pixelGridSize - emblemHeight - 1
                                        ? colorStops.length
                                        : 3),
                            ),
                        )
                    ]!;

                if (
                    columnIndex === 0 &&
                    rowIndex >= cheekInset &&
                    rowIndex <= pixelGridSize - cheekInset - 1 &&
                    random() < 0.4
                ) {
                    continue;
                }

                drawPixel(context, panelX + columnIndex * pixelSize, panelY + rowIndex * pixelSize, pixelSize, color);

                if (mirroredColumnIndex !== columnIndex) {
                    drawPixel(
                        context,
                        panelX + mirroredColumnIndex * pixelSize,
                        panelY + rowIndex * pixelSize,
                        pixelSize,
                        color,
                    );
                }
            }
        }

        const eyeRowIndex = 3 + Math.floor(random() * 2);
        const eyeColumnOffset = 2 + Math.floor(random() * 2);
        drawPixel(
            context,
            panelX + eyeColumnOffset * pixelSize,
            panelY + eyeRowIndex * pixelSize,
            pixelSize,
            palette.ink,
        );
        drawPixel(
            context,
            panelX + (pixelGridSize - eyeColumnOffset - 1) * pixelSize,
            panelY + eyeRowIndex * pixelSize,
            pixelSize,
            palette.ink,
        );
        drawPixel(
            context,
            panelX + eyeColumnOffset * pixelSize,
            panelY + eyeRowIndex * pixelSize,
            pixelSize * 0.44,
            '#ffffff',
        );
        drawPixel(
            context,
            panelX + (pixelGridSize - eyeColumnOffset - 1) * pixelSize,
            panelY + eyeRowIndex * pixelSize,
            pixelSize * 0.44,
            '#ffffff',
        );

        const mouthRowIndex = eyeRowIndex + 3;
        const mouthWidth = 2 + Math.floor(random() * 2);
        for (let mouthOffset = 0; mouthOffset < mouthWidth; mouthOffset++) {
            drawPixel(
                context,
                panelX + (4 + mouthOffset) * pixelSize,
                panelY + mouthRowIndex * pixelSize,
                pixelSize,
                palette.shadow,
            );
        }

        context.save();
        context.fillStyle = `${palette.highlight}44`;
        context.font = `${Math.round(size * 0.12)}px sans-serif`;
        context.textAlign = 'center';
        context.fillText(avatarDefinition.agentName.charAt(0).toUpperCase(), size * 0.5, size * 0.88);
        context.restore();
    },
};

/**
 * Draws one pixel-art block with a tiny inner highlight.
 *
 * @param context Canvas 2D context.
 * @param x Left coordinate.
 * @param y Top coordinate.
 * @param size Pixel size.
 * @param color Pixel fill color.
 *
 * @private helper of `pixelArtAvatarVisual`
 */
function drawPixel(context: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
    const normalizedSize = size * 0.9;
    const offset = (size - normalizedSize) / 2;

    context.fillStyle = color;
    context.fillRect(x + offset, y + offset, normalizedSize, normalizedSize);
    context.fillStyle = 'rgba(255,255,255,0.18)';
    context.fillRect(x + offset, y + offset, normalizedSize, normalizedSize * 0.14);
}
