'use client';

import {
    createAvatarPalette,
    createAvatarRandomFactory,
    normalizeAvatarDefinition,
    prepareAvatarCanvas,
} from './avatarRenderingUtils';
import { getAvatarVisualById } from './visuals/avatarVisualRegistry';
import type { RenderAvatarVisualOptions } from './types/AvatarVisualDefinition';

/**
 * Renders one deterministic avatar frame into the provided canvas.
 *
 * @param options Rendering options.
 *
 * @private shared helper for canvas avatar rendering
 */
export function renderAvatarVisual(options: RenderAvatarVisualOptions): void {
    const normalizedAvatarDefinition = normalizeAvatarDefinition(options.avatarDefinition);
    const avatarVisual = getAvatarVisualById(options.visualId);
    const context = options.canvas.getContext('2d');

    if (!context) {
        throw new Error('2D canvas rendering context is unavailable.');
    }

    prepareAvatarCanvas(options.canvas, context, options.size, options.devicePixelRatio || 1);

    avatarVisual.render({
        canvas: options.canvas,
        context,
        size: options.size,
        devicePixelRatio: options.devicePixelRatio || 1,
        timeMs: options.timeMs,
        avatarDefinition: normalizedAvatarDefinition,
        palette: createAvatarPalette(normalizedAvatarDefinition),
        createRandom: createAvatarRandomFactory(normalizedAvatarDefinition),
    });
}
