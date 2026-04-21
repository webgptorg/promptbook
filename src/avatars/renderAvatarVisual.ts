import {
    createAvatarPalette,
    createAvatarRandomFactory,
    normalizeAvatarDefinition,
    prepareAvatarCanvas,
} from './avatarRenderingUtils';
import { createIdleAvatarInteractionState } from './avatarInteractionUtils';
import { getAvatarVisualById } from './visuals/avatarVisualRegistry';
import type { RenderAvatarVisualOptions } from './types/AvatarVisualDefinition';
import type { AvatarDefinition } from './types/AvatarDefinition';
import type { AvatarPalette, AvatarSurfaceStyle, AvatarVisualDefinition, AvatarVisualId } from './types/AvatarVisualDefinition';

/**
 * Stable render data derived once from the avatar definition, surface, and visual id.
 *
 * @private shared helper for canvas avatar rendering
 */
export type ResolvedAvatarRenderDefinition = {
    readonly avatarDefinition: AvatarDefinition;
    readonly avatarVisual: AvatarVisualDefinition;
    readonly surface: AvatarSurfaceStyle;
    readonly palette: AvatarPalette;
    readonly createRandom: (salt: string) => () => number;
};

/**
 * Resolves the stable avatar render inputs reused across multiple frames.
 *
 * @param options Avatar identity and visual selection.
 * @returns Stable render data ready to be used by `renderAvatarVisual`.
 *
 * @private shared helper for canvas avatar rendering
 */
export function resolveAvatarRenderDefinition(options: {
    readonly avatarDefinition: AvatarDefinition;
    readonly visualId: AvatarVisualId;
    readonly surface?: AvatarSurfaceStyle;
}): ResolvedAvatarRenderDefinition {
    const avatarDefinition = normalizeAvatarDefinition(options.avatarDefinition);
    const surface = options.surface || 'framed';

    return {
        avatarDefinition,
        avatarVisual: getAvatarVisualById(options.visualId),
        surface,
        palette: createAvatarPalette(avatarDefinition, surface),
        createRandom: createAvatarRandomFactory(avatarDefinition),
    };
}

/**
 * Renders one deterministic avatar frame into the provided canvas.
 *
 * @param options Rendering options.
 * @param resolvedAvatarRenderDefinition Optional stable render data reused between frames.
 *
 * @private shared helper for canvas avatar rendering
 */
export function renderAvatarVisual(
    options: RenderAvatarVisualOptions,
    resolvedAvatarRenderDefinition?: ResolvedAvatarRenderDefinition,
): void {
    const resolvedRenderDefinition =
        resolvedAvatarRenderDefinition ||
        resolveAvatarRenderDefinition({
            avatarDefinition: options.avatarDefinition,
            visualId: options.visualId,
            surface: options.surface,
        });
    const context = options.canvas.getContext('2d');

    if (!context) {
        throw new Error('2D canvas rendering context is unavailable.');
    }

    prepareAvatarCanvas(options.canvas, context, options.size, options.devicePixelRatio || 1);

    resolvedRenderDefinition.avatarVisual.render({
        canvas: options.canvas,
        context,
        size: options.size,
        devicePixelRatio: options.devicePixelRatio || 1,
        timeMs: options.timeMs,
        avatarDefinition: resolvedRenderDefinition.avatarDefinition,
        palette: resolvedRenderDefinition.palette,
        createRandom: resolvedRenderDefinition.createRandom,
        surface: resolvedRenderDefinition.surface,
        interaction: options.interaction || createIdleAvatarInteractionState(),
    });
}
