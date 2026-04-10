import { describe, expect, it } from '@jest/globals';
import { createAgentDefaultAvatarParameters } from './AgentDefaultAvatarParameters';
import { renderAgentDefaultAvatarSvg } from './renderAgentDefaultAvatarSvg';

describe('renderAgentDefaultAvatarSvg', () => {
    it('renders byte-identical SVG for the same parameters', () => {
        const parameters = createAgentDefaultAvatarParameters({
            sourceHash: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            semanticProfile: {
                archetype: 'guide',
                kindness: 'high',
                strictness: 'low',
                energy: 'calm',
            },
        });

        const firstSvgBuffer = Buffer.from(renderAgentDefaultAvatarSvg(parameters), 'utf8');
        const secondSvgBuffer = Buffer.from(renderAgentDefaultAvatarSvg(parameters), 'utf8');

        expect(firstSvgBuffer.equals(secondSvgBuffer)).toBe(true);
        expect(firstSvgBuffer.toString('utf8')).toContain('shape-rendering="crispEdges"');
    });

    it('renders distinct avatars for different semantic profiles', () => {
        const kindParameters = createAgentDefaultAvatarParameters({
            sourceHash: 'fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
            semanticProfile: {
                archetype: 'guide',
                kindness: 'high',
                strictness: 'low',
                energy: 'calm',
            },
        });
        const strictParameters = createAgentDefaultAvatarParameters({
            sourceHash: 'fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
            semanticProfile: {
                archetype: 'guardian',
                kindness: 'medium',
                strictness: 'high',
                energy: 'steady',
            },
        });

        expect(renderAgentDefaultAvatarSvg(kindParameters)).not.toBe(renderAgentDefaultAvatarSvg(strictParameters));
    });
});
