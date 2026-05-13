import type { AvatarVisualDefinition, AvatarVisualId } from '../types/AvatarVisualDefinition';
import { asciiOctopusAvatarVisual } from './asciiOctopusAvatarVisual';
import { fractalAvatarVisual } from './fractalAvatarVisual';
import { minecraft2AvatarVisual } from './minecraft2AvatarVisual';
import { minecraftAvatarVisual } from './minecraftAvatarVisual';
import { octopus2AvatarVisual } from './octopus2AvatarVisual';
import { octopus3AvatarVisual } from './octopus3AvatarVisual';
import { octopusAvatarVisual } from './octopusAvatarVisual';
import { orbAvatarVisual } from './orbAvatarVisual';
import { pixelArtAvatarVisual } from './pixelArtAvatarVisual';

// Note: [💞] Ignore a discrepancy between file name and entity name

/**
 * Built-in avatar visuals available to the app.
 *
 * @private shared registry for the avatar rendering system
 */
export const AVATAR_VISUALS: ReadonlyArray<AvatarVisualDefinition> = [
    pixelArtAvatarVisual,
    octopusAvatarVisual,
    octopus2AvatarVisual,
    octopus3AvatarVisual,
    asciiOctopusAvatarVisual,
    minecraftAvatarVisual,
    minecraft2AvatarVisual,
    fractalAvatarVisual,
    orbAvatarVisual,
];

/**
 * Normalizes user-facing avatar visual names so ids can be matched case-insensitively
 * across spaces, hyphens, underscores, and future separator variants.
 *
 * @param value Raw avatar visual id or title.
 * @returns Stable lookup key.
 *
 * @private shared registry for the avatar rendering system
 */
function normalizeAvatarVisualLookupKey(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');
}

/**
 * Returns one avatar visual by its identifier.
 *
 * @param visualId Requested visual identifier.
 * @returns Matching visual definition.
 *
 * @private shared registry for the avatar rendering system
 */
export function getAvatarVisualById(visualId: AvatarVisualId): AvatarVisualDefinition {
    const avatarVisual = AVATAR_VISUALS.find((candidateAvatarVisual) => candidateAvatarVisual.id === visualId);

    if (!avatarVisual) {
        throw new Error(`Unknown avatar visual "${visualId}".`);
    }

    return avatarVisual;
}

/**
 * Resolves a user-facing avatar visual value to a supported built-in visual id.
 *
 * The lookup is derived from `AVATAR_VISUALS`, so new visuals become selectable by
 * adding them to the registry rather than updating parser-specific option lists.
 *
 * @param value Raw visual id/title, for example `PIXEL_ART`, `pixel art`, or `pixel-art`.
 * @returns Matching visual id or `null` when the value is empty/unknown.
 *
 * @private shared registry for the avatar rendering system
 */
export function resolveAvatarVisualId(value: string | null | undefined): AvatarVisualId | null {
    if (!value) {
        return null;
    }

    const normalizedValue = normalizeAvatarVisualLookupKey(value);
    if (!normalizedValue) {
        return null;
    }

    const avatarVisual = AVATAR_VISUALS.find(
        (candidateAvatarVisual) =>
            normalizeAvatarVisualLookupKey(candidateAvatarVisual.id) === normalizedValue ||
            normalizeAvatarVisualLookupKey(candidateAvatarVisual.title) === normalizedValue,
    );

    return avatarVisual?.id || null;
}
