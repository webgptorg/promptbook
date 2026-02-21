import { describe, expect, it } from '@jest/globals';
import type { AgentReferenceResolver } from '../../../../../src/book-2.0/agent-source/AgentReferenceResolver';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import { createUnresolvedAgentReferenceDiagnostics } from './createUnresolvedAgentReferenceDiagnostics';

/**
 * Builds a deterministic resolver mock for unresolved-reference diagnostics tests.
 *
 * @returns Agent reference resolver mock.
 */
function createMockResolver(): AgentReferenceResolver {
    return {
        resolveCommitmentContent: async (commitmentType, content) => {
            if (content === '{Known Teammate}') {
                return 'https://local.example/agents/known-teammate';
            }

            if (content === '{https://remote.example/agents/visible}') {
                return 'https://remote.example/agents/visible';
            }

            if (commitmentType === 'FROM') {
                return 'VOID';
            }

            return '';
        },
    };
}

describe('createUnresolvedAgentReferenceDiagnostics', () => {
    it('returns Monaco diagnostics for unresolved FROM/TEAM/IMPORT compact references', async () => {
        const resolver = createMockResolver();
        const agentSource = `Editor Test Agent
FROM {Missing Parent}
RULE Keep {this} untouched
TEAM {Known Teammate}
TEAM {Missing Teammate}
IMPORT {Missing Import}
TEAM {https://remote.example/agents/visible}` as string_book;

        const result = await createUnresolvedAgentReferenceDiagnostics(agentSource, resolver);
        const diagnostics = result.diagnostics;
        const missingAgentReferences = result.missingAgentReferences;

        expect(diagnostics).toEqual([
            expect.objectContaining({
                startLineNumber: 2,
                startColumn: 6,
                message: 'Referenced agent "Missing Parent" in FROM commitment was not found.',
            }),
            expect.objectContaining({
                startLineNumber: 5,
                startColumn: 6,
                message: 'Referenced agent "Missing Teammate" in TEAM commitment was not found.',
            }),
            expect.objectContaining({
                startLineNumber: 6,
                startColumn: 8,
                message: 'Referenced agent "Missing Import" in IMPORT commitment was not found.',
            }),
        ]);

        expect(missingAgentReferences).toEqual([
            {
                reference: 'Missing Teammate',
                token: '{Missing Teammate}',
                commitmentType: 'TEAM',
            },
        ]);
    });

    it('returns empty diagnostics when no compact references are present', async () => {
        const resolver = createMockResolver();
        const agentSource = `Editor Test Agent
RULE Everything is explicit
KNOWLEDGE https://example.com/doc.txt` as string_book;

        const result = await createUnresolvedAgentReferenceDiagnostics(agentSource, resolver);

        expect(result).toEqual({
            diagnostics: [],
            missingAgentReferences: [],
        });
    });
});
