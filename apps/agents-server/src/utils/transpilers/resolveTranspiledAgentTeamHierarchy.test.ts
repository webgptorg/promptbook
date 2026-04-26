import { describe, expect, it, jest, afterEach } from '@jest/globals';
import { book } from '../../../../../src/pipeline/book-notation';
import { resolveTranspiledAgentTeamHierarchy } from './resolveTranspiledAgentTeamHierarchy';

describe('resolveTranspiledAgentTeamHierarchy', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('resolves nested teammates from the /api/book source route', async () => {
        const agentSource = book`
            Root Agent

            TEAM https://example.com/agents/alpha
        `;
        const alphaSource = book`
            Alpha Agent

            PERSONA Alpha profile
            TEAM https://example.com/agents/beta
        `;
        const betaSource = book`
            Beta Agent

            PERSONA Beta profile
        `;
        const fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
            const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

            switch (url) {
                case 'https://example.com/agents/alpha/api/book?recursionLevel=1':
                    return new Response(alphaSource, { status: 200 });
                case 'https://example.com/agents/beta/api/book?recursionLevel=1':
                    return new Response(betaSource, { status: 200 });
                default:
                    return new Response('Not found', { status: 404 });
            }
        });

        const teamHierarchy = await resolveTranspiledAgentTeamHierarchy({
            agentSource,
        });

        expect(fetchMock).toHaveBeenCalledWith('https://example.com/agents/alpha/api/book?recursionLevel=1', {
            cache: 'no-store',
        });
        expect(fetchMock).toHaveBeenCalledWith('https://example.com/agents/beta/api/book?recursionLevel=1', {
            cache: 'no-store',
        });
        expect(teamHierarchy).toEqual([
            expect.objectContaining({
                agentName: 'Alpha Agent',
                label: 'Alpha Agent',
                url: 'https://example.com/agents/alpha',
                personaDescription: 'Alpha profile',
                teamMembers: [
                    expect.objectContaining({
                        agentName: 'Beta Agent',
                        label: 'Beta Agent',
                        url: 'https://example.com/agents/beta',
                        personaDescription: 'Beta profile',
                        teamMembers: [],
                    }),
                ],
            }),
        ]);
    });
});
