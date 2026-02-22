import { describe, expect, it } from '@jest/globals';
import { book } from '../../../../src/_packages/core.index'; // <- [🚾]
import type { AgentCollection } from '../../../../src/collection/agent-collection/AgentCollection';
import { createServerAgentReferenceResolver } from './agentReferenceResolver/createServerAgentReferenceResolver';
import { resolveInheritedAgentSource } from './resolveInheritedAgentSource';

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

describe('how `resolveInheritedAgentSource` works', () => {
    it('should resolve `FROM` commitment in agent', async () => {
        await expect(
            resolveInheritedAgentSource(book`
                Beatrice

                FROM https://core-test.ptbk.io/agents/test-0
                LANGUAGE Italian
            `),
        ).resolves.toEqual(
            book`
                Beatrice

                NOTE Inherited FROM https://core-test.ptbk.io/agents/test-0
                FROM VOID
                NONCE 0

                ---

                LANGUAGE Italian
            `,
        );
    });

    it('should resolve `FROM VOID` commitment in agent', async () => {
        await expect(
            resolveInheritedAgentSource(book`
                Beatrice

                FROM VOID
                LANGUAGE Italian
            `),
        ).resolves.toEqual(
            book`
                Beatrice

                FROM VOID
                LANGUAGE Italian
            `,
        );
    });

    it('should resolve `FROM {Void}` commitment in agent', async () => {
        await expect(
            resolveInheritedAgentSource(book`
                Beatrice

                FROM {Void}
                LANGUAGE Italian
            `),
        ).resolves.toEqual(
            book`
                Beatrice

                FROM {Void}
                LANGUAGE Italian
            `,
        );
    });

    it('should keep the agent working when compact FROM reference is missing', async () => {
        const agentReferenceResolver = await createServerAgentReferenceResolver({
            agentCollection: createMockAgentCollection([]),
            localServerUrl: 'https://local.example',
        });

        const resolvedAgentSource = await resolveInheritedAgentSource(
            book`
                Beatrice

                FROM {Unknown Parent}
                LANGUAGE Italian
            `,
            {
                agentReferenceResolver,
                adamAgentUrl: 'https://core-test.ptbk.io/agents/test-0',
            },
        );

        expect(resolvedAgentSource).toContain(
            'NOTE Referenced agent "Unknown Parent" in FROM commitment was not found. Inheritance skipped.',
        );
        expect(resolvedAgentSource).toContain('LANGUAGE Italian');
    });

    it('should keep the agent working when compact IMPORT reference is missing', async () => {
        const agentReferenceResolver = await createServerAgentReferenceResolver({
            agentCollection: createMockAgentCollection([]),
            localServerUrl: 'https://local.example',
        });

        const resolvedAgentSource = await resolveInheritedAgentSource(
            book`
                Beatrice

                FROM VOID
                IMPORT {Unknown Source}
                LANGUAGE Italian
            `,
            {
                agentReferenceResolver,
                adamAgentUrl: 'https://core-test.ptbk.io/agents/test-0',
            },
        );

        expect(resolvedAgentSource).toContain(
            'NOTE Referenced agent "Unknown Source" in IMPORT commitment was not found. Import skipped.',
        );
        expect(resolvedAgentSource).toContain('LANGUAGE Italian');
    });

    // TODO: !!!! Test implicit FROM Adam
    // TODO: !!!! Test IMPORT commitment
    // TODO: !!!! Test recursive FROM / IMPORT commitments
});

/**
 * TODO: [🐱‍🚀][🏠] Test local requesting agents by name and permanent ID
 */
