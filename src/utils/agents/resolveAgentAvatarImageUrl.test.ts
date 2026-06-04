import { describe, expect, it } from '@jest/globals';
import {
    DEFAULT_AGENT_AVATAR_VISUAL_ID,
    resolveAgentAvatar,
    resolveAgentAvatarImageUrl,
    resolveAgentAvatarVisualId,
} from './resolveAgentAvatarImageUrl';

describe('resolveAgentAvatar', () => {
    it('prefers explicit META IMAGE when one is provided', () => {
        const resolvedAgentAvatar = resolveAgentAvatar({
            agent: {
                agentName: 'Assistant',
                agentHash: 'hash-1',
                meta: {
                    image: './avatar.png',
                    color: '#ff3366',
                },
            },
            baseUrl: 'https://agents.example/agents/assistant',
        });

        expect(resolvedAgentAvatar).toEqual({
            type: 'image',
            imageUrl: 'https://agents.example/agents/avatar.png',
        });
    });

    it('returns the default avatar visual and parsed META COLOR palette when no explicit image is set', () => {
        const resolvedAgentAvatar = resolveAgentAvatar({
            agent: {
                agentName: 'Assistant',
                agentHash: 'hash-2',
                permanentId: 'assistant-1',
                meta: {
                    color: '#ff3366, rgba(10, 20, 30, 0.7) | #00ffaa',
                },
            },
            baseUrl: 'https://agents.example/',
        });

        expect(resolvedAgentAvatar?.type).toBe('visual');
        expect(resolvedAgentAvatar?.type === 'visual' ? resolvedAgentAvatar.visualId : null).toBe(
            DEFAULT_AGENT_AVATAR_VISUAL_ID,
        );
        expect(resolvedAgentAvatar?.type === 'visual' ? resolvedAgentAvatar.avatarDefinition.colors : null).toEqual([
            '#ff3366',
            '#0a141eb3',
            '#00ffaa',
        ]);
        expect(
            resolveAgentAvatarImageUrl({
                agent: {
                    agentName: 'Assistant',
                    agentHash: 'hash-2',
                    permanentId: 'assistant-1',
                    meta: {
                        color: '#ff3366',
                    },
                },
                baseUrl: 'https://agents.example/',
            }),
        ).toBe('https://agents.example/agents/assistant-1/images/default-avatar.png');
    });

    it('treats implicit profile fallback images as visuals so interactive UIs can stay animated', () => {
        const resolvedAgentAvatar = resolveAgentAvatar({
            agent: {
                agentName: 'Assistant',
                agentHash: 'hash-3',
                permanentId: 'assistant-2',
                meta: {
                    image: 'https://agents.example/agents/assistant-2/images/default-avatar.png',
                    color: '#4477ff',
                },
                isMetaImageExplicit: false,
                avatarVisualId: 'octopus2',
            },
            baseUrl: 'https://agents.example/',
        });

        expect(resolvedAgentAvatar?.type).toBe('visual');
        expect(resolvedAgentAvatar?.type === 'visual' ? resolvedAgentAvatar.visualId : null).toBe('octopus2');
    });

    it('uses the federated server default avatar visual when the agent does not define an explicit visual', () => {
        const resolvedAgentAvatar = resolveAgentAvatar({
            agent: {
                agentName: 'Remote Assistant',
                agentHash: 'hash-5',
                permanentId: 'remote-assistant',
                meta: {
                    color: '#4477ff',
                },
                defaultAgentAvatarVisualId: 'ascii-octopus',
            },
            baseUrl: 'https://remote.example/',
        });

        expect(resolvedAgentAvatar?.type).toBe('visual');
        expect(resolvedAgentAvatar?.type === 'visual' ? resolvedAgentAvatar.visualId : null).toBe('ascii-octopus');
    });

    it('prefers normalized META AVATAR over the server default visual', () => {
        const agent = {
            agentName: 'Assistant',
            agentHash: 'hash-4',
            permanentId: 'assistant-3',
            meta: {
                avatar: 'pixel-art',
            },
        } as const;
        const resolvedAgentAvatar = resolveAgentAvatar({
            agent: {
                ...agent,
                avatarVisualId: 'octopus2',
            },
        });

        expect(resolveAgentAvatarVisualId(agent, 'octopus2')).toBe('pixel-art');
        expect(resolvedAgentAvatar?.type).toBe('visual');
        expect(resolvedAgentAvatar?.type === 'visual' ? resolvedAgentAvatar.visualId : null).toBe('pixel-art');
    });
});
