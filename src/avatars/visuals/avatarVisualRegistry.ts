import { asciiOctopusAvatarVisual } from './asciiOctopusAvatarVisual';
import type { AvatarVisualDefinition, AvatarVisualId } from '../types/AvatarVisualDefinition';
import { fractalAvatarVisual } from './fractalAvatarVisual';
import { minecraftAvatarVisual } from './minecraftAvatarVisual';
import { octopusAvatarVisual } from './octopusAvatarVisual';
import { octopus2AvatarVisual } from './octopus2AvatarVisual';
import { octopus3AvatarVisual } from './octopus3AvatarVisual';
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
    fractalAvatarVisual,
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
