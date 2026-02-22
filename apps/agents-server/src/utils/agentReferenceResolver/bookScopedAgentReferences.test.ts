import { describe, expect, it } from '@jest/globals';
import { book } from '../../../../../src/_packages/core.index';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import type { AgentCollection } from '../../../../../src/collection/agent-collection/AgentCollection';
import {
    createBookScopedAgentIdentifier,
    createBookScopedAgentReferenceResolver,
    createBookScopedAgentUrl,
    extractEmbeddedAgentSourcesFromBook,
    parseBookScopedAgentIdentifier,
    resolveBookScopedAgentContext,
} from './bookScopedAgentReferences';

/**
 * Builds a deterministic collection mock for route-context tests.
 *
 * @param sourceById - Source table keyed by parent identifier.
 * @returns Minimal `AgentCollection` mock.
 */
function createMockCollection(sourceById: Record<string, string_book>): AgentCollection {
    return {
        getAgentPermanentId: async (agentIdentifier: string) => {
            if (sourceById[agentIdentifier]) {
                return agentIdentifier;
            }

            throw new Error(`Unknown agent: ${agentIdentifier}`);
        },
        getAgentSource: async (agentIdentifier: string) => {
            const source = sourceById[agentIdentifier];
            if (!source) {
                throw new Error(`Unknown source: ${agentIdentifier}`);
            }

            return source;
        },
    } as unknown as AgentCollection;
}

describe('bookScopedAgentReferences', () => {
    it('extracts embedded agent sections after horizontal lines', () => {
        const source = book`
            Main Agent
            PERSONA Parent

            ---

            Copywriter
            PERSONA Writes copy

            ---

            Developer
            PERSONA Writes code
        `;

        const embeddedSources = extractEmbeddedAgentSourcesFromBook(source);

        expect(Array.from(embeddedSources.keys())).toEqual(['copywriter', 'developer']);
        expect(embeddedSources.get('copywriter')).toContain('Copywriter');
        expect(embeddedSources.get('developer')).toContain('PERSONA Writes code');
    });

    it('roundtrips synthetic book-scoped identifiers', () => {
        const identifier = createBookScopedAgentIdentifier('parent-123', 'Copywriter Agent');
        const parsed = parseBookScopedAgentIdentifier(identifier);

        expect(parsed).toEqual({
            parentAgentIdentifier: 'parent-123',
            embeddedAgentName: 'copywriter-agent',
        });
    });

    it('resolves local embedded references before delegating to fallback resolver', async () => {
        const source = book`
            Main Agent
            TEAM {Copywriter} and {External Agent}

            ---

            Copywriter
            PERSONA Writes copy
        `;
        const resolver = createBookScopedAgentReferenceResolver({
            parentAgentSource: source,
            parentAgentIdentifier: 'parent-123',
            localServerUrl: 'https://local.example/',
            fallbackResolver: {
                resolveCommitmentContent: async (_commitmentType, content) =>
                    content.replace('{External Agent}', 'https://federated.example/agents/external-agent'),
            },
        });

        const resolved = await resolver.resolveCommitmentContent('TEAM', '{Copywriter} and {External Agent}');

        expect(resolved).toBe(
            `${createBookScopedAgentUrl('https://local.example/', 'parent-123', 'copywriter')} and https://federated.example/agents/external-agent`,
        );
    });

    it('resolves embedded route identifiers to section sources', async () => {
        const parentSource = book`
            Main Agent
            TEAM {Copywriter}

            ---

            Copywriter
            PERSONA Writes copy
        `;
        const collection = createMockCollection({
            parent: parentSource,
        });
        const embeddedIdentifier = createBookScopedAgentIdentifier('parent', 'Copywriter');

        const context = await resolveBookScopedAgentContext({
            collection,
            agentIdentifier: embeddedIdentifier,
            localServerUrl: 'https://local.example',
        });

        expect(context.isBookScopedAgent).toBe(true);
        expect(context.parentAgentPermanentId).toBe('parent');
        expect(context.resolvedAgentName).toBe('copywriter');
        expect(context.resolvedAgentSource).toContain('Copywriter');
    });
});
