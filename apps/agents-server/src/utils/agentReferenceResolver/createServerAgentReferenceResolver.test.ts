import { describe, expect, it } from '@jest/globals';
import type { AgentCollection } from '../../../../../src/collection/agent-collection/AgentCollection';
import { PSEUDO_AGENT_USER_URL } from '../../../../../src/book-2.0/agent-source/pseudoAgentReferences';
import {
    consumeAgentReferenceResolutionIssues,
    type IssueTrackingAgentReferenceResolver,
} from './AgentReferenceResolutionIssue';
import { createServerAgentReferenceResolver } from './createServerAgentReferenceResolver';

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

describe('createServerAgentReferenceResolver', () => {
    it('resolves local compact references by name', async () => {
        const resolver = (await createServerAgentReferenceResolver({
            agentCollection: createMockAgentCollection([{ agentName: 'Alice Cooper', permanentId: 'abc123' }]),
            localServerUrl: 'https://local.example',
        })) as IssueTrackingAgentReferenceResolver;

        const resolved = await resolver.resolveCommitmentContent('FROM', '{Alice Cooper}');

        expect(resolved).toBe('https://local.example/agents/abc123');
        expect(consumeAgentReferenceResolutionIssues(resolver)).toEqual([]);
    });

    it('records unresolved references and uses FROM fallback', async () => {
        const resolver = (await createServerAgentReferenceResolver({
            agentCollection: createMockAgentCollection([]),
            localServerUrl: 'https://local.example',
        })) as IssueTrackingAgentReferenceResolver;

        const resolved = await resolver.resolveCommitmentContent('FROM', '{Unknown Agent}');
        const issues = consumeAgentReferenceResolutionIssues(resolver);

        expect(resolved).toBe('VOID');
        expect(issues).toEqual([
            expect.objectContaining({
                commitmentType: 'FROM',
                reference: 'Unknown Agent',
            }),
        ]);
        expect(consumeAgentReferenceResolutionIssues(resolver)).toEqual([]);
    });

    it('resolves `{Void}` in FROM without unresolved issues', async () => {
        const resolver = (await createServerAgentReferenceResolver({
            agentCollection: createMockAgentCollection([]),
            localServerUrl: 'https://local.example',
        })) as IssueTrackingAgentReferenceResolver;

        const resolved = await resolver.resolveCommitmentContent('FROM', '{VoId}');

        expect(resolved).toBe('{Void}');
        expect(consumeAgentReferenceResolutionIssues(resolver)).toEqual([]);
    });

    it('resolves `{User}` in TEAM to pseudo-user URL', async () => {
        const resolver = (await createServerAgentReferenceResolver({
            agentCollection: createMockAgentCollection([]),
            localServerUrl: 'https://local.example',
        })) as IssueTrackingAgentReferenceResolver;

        const resolved = await resolver.resolveCommitmentContent('TEAM', '{UsEr}');

        expect(resolved).toBe(PSEUDO_AGENT_USER_URL);
        expect(consumeAgentReferenceResolutionIssues(resolver)).toEqual([]);
    });

    it('rejects `{User}` in FROM and records an issue', async () => {
        const resolver = (await createServerAgentReferenceResolver({
            agentCollection: createMockAgentCollection([]),
            localServerUrl: 'https://local.example',
        })) as IssueTrackingAgentReferenceResolver;

        const resolved = await resolver.resolveCommitmentContent('FROM', '{User}');
        const issues = consumeAgentReferenceResolutionIssues(resolver);

        expect(resolved).toBe('VOID');
        expect(issues).toEqual([
            expect.objectContaining({
                commitmentType: 'FROM',
                reference: 'User',
                message: 'Pseudo-agent "User" cannot be used in FROM commitment.',
            }),
        ]);
    });
});
