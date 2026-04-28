import { describe, expect, it } from '@jest/globals';
import { AVATAR_VISUALS } from '../../../../src/avatars';
import {
    DEFAULT_AGENT_AVATAR_VISUAL_METADATA_KEY,
    DEFAULT_AGENT_AVATAR_VISUAL_METADATA_OPTIONS,
    DEFAULT_AGENT_AVATAR_VISUAL_METADATA_VALUE,
    DEFAULT_AGENT_AVATAR_VISUAL_METADATA_VALUES,
    resolveDefaultAgentAvatarVisualId,
} from './defaultAgentAvatarVisual';

describe('default agent avatar visual metadata', () => {
    it('exposes every built-in avatar visual through metadata', () => {
        expect(DEFAULT_AGENT_AVATAR_VISUAL_METADATA_OPTIONS).toEqual(
            AVATAR_VISUALS.map((avatarVisual) => ({
                metadataValue: avatarVisual.id.replaceAll('-', '_').toUpperCase(),
                visualId: avatarVisual.id,
                title: avatarVisual.title,
            })),
        );
        expect(DEFAULT_AGENT_AVATAR_VISUAL_METADATA_VALUES).toContain(DEFAULT_AGENT_AVATAR_VISUAL_METADATA_VALUE);
        expect(DEFAULT_AGENT_AVATAR_VISUAL_METADATA_KEY).toBe('DEFAULT_AGENT_AVATAR_VISUAL');
    });

    it('resolves explicit metadata values to the matching built-in visual id', () => {
        expect(resolveDefaultAgentAvatarVisualId('OCTOPUS3')).toBe('octopus3');
        expect(resolveDefaultAgentAvatarVisualId('ASCII_OCTOPUS')).toBe('ascii-octopus');
        expect(resolveDefaultAgentAvatarVisualId('ascii octopus')).toBe('ascii-octopus');
        expect(resolveDefaultAgentAvatarVisualId('pixel-art')).toBe('pixel-art');
    });

    it('falls back to octopus3 for missing or invalid metadata values', () => {
        expect(resolveDefaultAgentAvatarVisualId('unknown')).toBe('octopus3');
        expect(resolveDefaultAgentAvatarVisualId(null)).toBe('octopus3');
    });
});
