import { describe, expect, it } from '@jest/globals';
import {
    AGENT_DEFAULT_AVATAR_RENDER_VERSION,
    AGENT_DEFAULT_AVATAR_SCHEMA_VERSION,
    AgentDefaultAvatarParametersSchema,
    createAgentDefaultAvatarFingerprint,
    createAgentDefaultAvatarParameters,
    parseAgentDefaultAvatarSemanticProfile,
    serializeAgentDefaultAvatarParameters,
} from './AgentDefaultAvatarParameters';

describe('deterministic avatar semantic profile contract', () => {
    it('accepts a kind persona classification from the LLM stage', () => {
        const semanticProfile = parseAgentDefaultAvatarSemanticProfile(`
            {
              "archetype": "guide",
              "kindness": "high",
              "strictness": "low",
              "energy": "calm"
            }
        `);

        expect(semanticProfile).toEqual({
            archetype: 'guide',
            kindness: 'high',
            strictness: 'low',
            energy: 'calm',
        });
    });

    it('accepts a strict persona classification from the LLM stage', () => {
        const semanticProfile = parseAgentDefaultAvatarSemanticProfile(`
            {
              "archetype": "guardian",
              "kindness": "medium",
              "strictness": "high",
              "energy": "steady"
            }
        `);

        expect(semanticProfile).toEqual({
            archetype: 'guardian',
            kindness: 'medium',
            strictness: 'high',
            energy: 'steady',
        });
    });

    it('rejects enum values outside the allowed schema', () => {
        expect(() =>
            parseAgentDefaultAvatarSemanticProfile(`
                {
                  "archetype": "wizard",
                  "kindness": "very-high",
                  "strictness": "low",
                  "energy": "calm"
                }
            `),
        ).toThrow('deterministic avatar schema');
    });
});

describe('createAgentDefaultAvatarParameters', () => {
    it('creates stable stored parameters with versions and deterministic seeds', () => {
        const parameters = createAgentDefaultAvatarParameters({
            sourceHash: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
            semanticProfile: {
                archetype: 'analyst',
                kindness: 'medium',
                strictness: 'high',
                energy: 'steady',
            },
        });

        expect(AgentDefaultAvatarParametersSchema.parse(parameters)).toEqual(parameters);
        expect(parameters.schemaVersion).toBe(AGENT_DEFAULT_AVATAR_SCHEMA_VERSION);
        expect(parameters.renderVersion).toBe(AGENT_DEFAULT_AVATAR_RENDER_VERSION);
        expect(parameters.paletteSeed).toBeGreaterThanOrEqual(0);
        expect(parameters.backgroundSeed).toBeGreaterThanOrEqual(0);
        expect(parameters.silhouetteSeed).toBeGreaterThanOrEqual(0);
        expect(parameters.detailSeed).toBeGreaterThanOrEqual(0);
    });

    it('serializes stored parameters in a stable key order', () => {
        const parameters = createAgentDefaultAvatarParameters({
            sourceHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            semanticProfile: {
                archetype: 'creator',
                kindness: 'high',
                strictness: 'medium',
                energy: 'lively',
            },
        });

        expect(serializeAgentDefaultAvatarParameters(parameters)).toBe(
            JSON.stringify({
                schemaVersion: parameters.schemaVersion,
                renderVersion: parameters.renderVersion,
                archetype: parameters.archetype,
                kindness: parameters.kindness,
                strictness: parameters.strictness,
                energy: parameters.energy,
                paletteSeed: parameters.paletteSeed,
                backgroundSeed: parameters.backgroundSeed,
                silhouetteSeed: parameters.silhouetteSeed,
                detailSeed: parameters.detailSeed,
            }),
        );
    });

    it('creates a stable cache fingerprint for one source hash', () => {
        const fingerprint = createAgentDefaultAvatarFingerprint(
            'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        );

        expect(fingerprint).toBe(
            createAgentDefaultAvatarFingerprint('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'),
        );
        expect(fingerprint).toHaveLength(64);
    });
});
