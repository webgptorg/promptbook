import { describe, expect, it } from '@jest/globals';
import { createAgentDefaultAvatarParameters } from './AgentDefaultAvatarParameters';
import { renderAgentDefaultAvatarPng } from './renderAgentDefaultAvatarPng';

/**
 * Deterministic test fingerprint used by the renderer tests.
 */
const TEST_AGENT_FINGERPRINT = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

/**
 * Stage-1 parameter sample used by the deterministic renderer tests.
 */
const TEST_PARAMETERS = createAgentDefaultAvatarParameters({
    agentFingerprint: TEST_AGENT_FINGERPRINT,
    semanticParameters: {
        traitTags: ['kind', 'creative'],
        kindness: 4,
        strictness: 1,
        energy: 3,
        formality: 2,
        archetype: 'mentor',
        paletteFamily: 'sunrise',
        backgroundPattern: 'halo',
        faceShape: 'round',
        eyeStyle: 'soft',
        accessory: 'glasses',
    },
});

describe('renderAgentDefaultAvatarPng', () => {
    it('returns byte-identical PNG output for the same parameters', () => {
        const firstRender = renderAgentDefaultAvatarPng(TEST_PARAMETERS);
        const secondRender = renderAgentDefaultAvatarPng(TEST_PARAMETERS);

        expect(firstRender.equals(secondRender)).toBe(true);
        expect(firstRender.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    });

    it('changes the PNG output when the semantic parameters change', () => {
        const strictParameters = createAgentDefaultAvatarParameters({
            agentFingerprint: TEST_AGENT_FINGERPRINT,
            semanticParameters: {
                traitTags: ['strict', 'analytical'],
                kindness: 1,
                strictness: 4,
                energy: 2,
                formality: 4,
                archetype: 'guardian',
                paletteFamily: 'slate',
                backgroundPattern: 'circuit',
                faceShape: 'square',
                eyeStyle: 'focused',
                accessory: 'badge',
            },
        });

        const firstRender = renderAgentDefaultAvatarPng(TEST_PARAMETERS);
        const secondRender = renderAgentDefaultAvatarPng(strictParameters);

        expect(firstRender.equals(secondRender)).toBe(false);
    });
});
