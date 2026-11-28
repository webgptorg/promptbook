import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { loadFederatedServerAgents } from './loadFederatedServerAgents';

/**
 * Original fetch implementation restored after each loader test.
 */
const ORIGINAL_FETCH = global.fetch;

describe('loadFederatedServerAgents', () => {
    afterEach(() => {
        global.fetch = ORIGINAL_FETCH;
        jest.restoreAllMocks();
    });

    it('propagates the federated server default avatar visual to each loaded agent', async () => {
        global.fetch = jest.fn(async () => {
            return new Response(
                JSON.stringify({
                    agents: [
                        {
                            agentName: 'Remote Helper',
                            agentHash: 'remote-helper-hash',
                            permanentId: 'remote-helper',
                            personaDescription: 'Remote assistant',
                            initialMessage: null,
                            meta: {
                                fullname: 'Remote Helper',
                                description: 'Remote assistant',
                                color: '#4477ff',
                            },
                            links: [],
                            parameters: [],
                            capabilities: [],
                            samples: [],
                            knowledgeSources: [],
                        },
                    ],
                    defaultAgentAvatarVisualId: 'ascii-octopus',
                }),
                {
                    status: 200,
                    headers: {
                        'content-type': 'application/json',
                    },
                },
            );
        }) as typeof fetch;

        const agents = await loadFederatedServerAgents('https://remote.example/');

        expect(agents).toHaveLength(1);
        expect(agents[0]).toMatchObject({
            agentName: 'Remote Helper',
            permanentId: 'remote-helper',
            serverUrl: 'https://remote.example',
            defaultAgentAvatarVisualId: 'ascii-octopus',
        });
        expect(agents[0]?.url).toContain('https://remote.example/agents/remote-helper');
    });
});
