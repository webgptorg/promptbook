import { AVATAR_VISUALS } from '../../../../src/avatars';
import type { AvatarVisualId } from '../../../../src/avatars/types/AvatarVisualDefinition';
import { DEFAULT_AGENT_AVATAR_VISUAL_ID as SHARED_DEFAULT_AGENT_AVATAR_VISUAL_ID } from '../../../../src/utils/agents/resolveAgentAvatarImageUrl';

/**
 * Metadata key controlling the built-in avatar visual used for agents without `META IMAGE`.
 */
export const DEFAULT_AGENT_AVATAR_VISUAL_METADATA_KEY = 'DEFAULT_AGENT_AVATAR_VISUAL';

/**
 * One metadata option that can select a built-in default agent avatar visual.
 */
type DefaultAgentAvatarVisualMetadataOption = {
    /**
     * Metadata value written into the `Metadata` table.
     */
    readonly metadataValue: string;

    /**
     * Built-in visual id used by the shared avatar renderer.
     */
    readonly visualId: AvatarVisualId;

    /**
     * Human-friendly visual title from the shared avatar registry.
     */
    readonly title: string;
};

/**
 * All built-in avatar visuals exposed through Agents Server metadata.
 *
 * This is derived from the shared avatar registry so new visuals become metadata-addressable
 * by adding them to the registry instead of duplicating option lists across the server.
 */
export const DEFAULT_AGENT_AVATAR_VISUAL_METADATA_OPTIONS: ReadonlyArray<DefaultAgentAvatarVisualMetadataOption> =
    AVATAR_VISUALS.map((avatarVisual) => ({
        metadataValue: avatarVisual.id.replaceAll('-', '_').toUpperCase(),
        visualId: avatarVisual.id,
        title: avatarVisual.title,
    }));

/**
 * Supported metadata values accepted by `DEFAULT_AGENT_AVATAR_VISUAL`.
 */
export const DEFAULT_AGENT_AVATAR_VISUAL_METADATA_VALUES = DEFAULT_AGENT_AVATAR_VISUAL_METADATA_OPTIONS.map(
    ({ metadataValue }) => metadataValue,
);

/**
 * Default metadata value that maps to the shared fallback visual.
 */
export const DEFAULT_AGENT_AVATAR_VISUAL_METADATA_VALUE =
    DEFAULT_AGENT_AVATAR_VISUAL_METADATA_OPTIONS.find(
        ({ visualId }) => visualId === SHARED_DEFAULT_AGENT_AVATAR_VISUAL_ID,
    )?.metadataValue || 'OCTOPUS3';

/**
 * Resolves one raw metadata value to a supported built-in avatar visual id.
 *
 * @param value - Raw metadata value stored in `Metadata`.
 * @returns Safe supported visual id.
 */
export function resolveDefaultAgentAvatarVisualId(value: string | null | undefined): AvatarVisualId {
    const normalizedValue = value?.trim().toUpperCase();
    const resolvedOption = DEFAULT_AGENT_AVATAR_VISUAL_METADATA_OPTIONS.find(
        ({ metadataValue }) => metadataValue === normalizedValue,
    );

    return resolvedOption?.visualId || SHARED_DEFAULT_AGENT_AVATAR_VISUAL_ID;
}
