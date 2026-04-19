import type { AvatarVisualDefinition, AvatarVisualId } from '../types/AvatarVisualDefinition';
import { minecraftAvatarVisual } from './minecraftAvatarVisual';
import { octopusAvatarVisual } from './octopusAvatarVisual';
import { octopus2AvatarVisual } from './octopus2AvatarVisual';
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
    minecraftAvatarVisual,
];

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
