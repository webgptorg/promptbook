import { describe, expect, it } from '@jest/globals';
import { book } from '../../../../../src/_packages/core.index';
import type { AgentCollection } from '../../../../../src/collection/agent-collection/AgentCollection';
import { PSEUDO_AGENT_USER_URL } from '../../../../../src/book-2.0/agent-source/pseudoAgentReferences';
import { createServerAgentReferenceResolver } from './createServerAgentReferenceResolver';
import { resolveTeamCapabilitiesFromAgentSource } from './resolveTeamCapabilitiesFromAgentSource';

/**
 * Builds a minimal collection mock used by resolver tests.
 *
 * @param agentRecords - Local agents exposed by `listAgents`.
 * @returns Agent collection mock.
 */
function createMockAgentCollection(agentRecords: Array<{ agentName: string; permanentId?: string }>): AgentCollection {
    return {
        listAgents: async () => agentRecords,
    } as unknown as AgentCollection;
}

describe('resolveTeamCapabilitiesFromAgentSource', () => {
    it('returns warning capability for unresolved compact teammates and keeps valid teammates', async () => {
        const resolver = await createServerAgentReferenceResolver({
            agentCollection: createMockAgentCollection([{ agentName: 'Known Teammate', permanentId: 'known123' }]),
            localServerUrl: 'https://local.example',
        });

        const capabilities = await resolveTeamCapabilitiesFromAgentSource(
            book`
                Team Agent

                TEAM {Unknown Agent}
                TEAM {Known Teammate}
            `,
            resolver,
        );

        expect(capabilities).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    type: 'team',
                    label: 'Unknown Agent (not found)',
                    iconName: 'ShieldAlert',
                }),
                expect.objectContaining({
                    type: 'team',
                    iconName: 'Users',
                    agentUrl: 'https://local.example/agents/known123',
                }),
            ]),
        );
    });

    it('resolves `{User}` TEAM compact references to pseudo-user capability', async () => {
        const resolver = await createServerAgentReferenceResolver({
            agentCollection: createMockAgentCollection([]),
            localServerUrl: 'https://local.example',
        });

        const capabilities = await resolveTeamCapabilitiesFromAgentSource(
            book`
                Team Agent

                TEAM {USER}
            `,
            resolver,
        );

        expect(capabilities).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    type: 'team',
                    iconName: 'Users',
                    label: 'User',
                    agentUrl: PSEUDO_AGENT_USER_URL,
                }),
            ]),
        );
    });
});
