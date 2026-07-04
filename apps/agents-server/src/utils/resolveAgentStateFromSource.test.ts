import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { book, createAgentModelRequirements } from '../../../../src/_packages/core.index'; // <- [🚾]
import type { AgentBasicInformation } from '../../../../src/book-2.0/agent-source/AgentBasicInformation';
import type { AgentCollection } from '../../../../src/collection/agent-collection/AgentCollection';
import type {
    string_agent_permanent_id,
    string_agent_url,
    string_book,
} from '../../../../src/_packages/types.index';
import { createServerAgentReferenceResolver } from './agentReferenceResolver/createServerAgentReferenceResolver';
import { createLocalAgentSourceImporter } from './createLocalAgentSourceImporter';
import { resolveAgentStateFromSource } from './resolveAgentStateFromSource';

/**
 * Original fetch implementation restored after each test.
 */
const ORIGINAL_FETCH = global.fetch;

/**
 * Installs one deterministic fetch mock for parent-agent imports.
 *
 * @param routes - Text responses keyed by normalized `/api/book` URL.
 */
function mockFetchRoutes(routes: Record<string, string>): void {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        const normalizedUrl = url.pathname.endsWith('/api/book')
            ? `${url.origin}${url.pathname}?recursionLevel=${url.searchParams.get('recursionLevel') || ''}`
            : url.href;
        const route = routes[normalizedUrl];

        if (!route) {
            throw new Error(`Unexpected fetch URL: ${url.href}`);
        }

        return new Response(route, {
            status: 200,
            headers: { 'content-type': 'text/plain' },
        });
    }) as typeof fetch;
}

/**
 * Source-backed local collection used by inheritance regression tests.
 *
 * @param agentRecords - Local agents keyed by name and permanent id.
 * @returns Minimal agent collection mock.
 */
function createMockAgentCollection(
    agentRecords: ReadonlyArray<{
        readonly agentName: string;
        readonly permanentId: string;
        readonly agentSource: string_book;
    }>,
): AgentCollection {
    const findAgentRecord = (agentNameOrPermanentId: string) => {
        const agentRecord = agentRecords.find(
            (candidate) =>
                candidate.agentName === agentNameOrPermanentId || candidate.permanentId === agentNameOrPermanentId,
        );

        if (!agentRecord) {
            throw new Error(`Unexpected agent lookup: ${agentNameOrPermanentId}`);
        }

        return agentRecord;
    };

    return {
        async listAgents() {
            return agentRecords.map(
                (agentRecord) =>
                    ({
                        agentName: agentRecord.agentName,
                        permanentId: agentRecord.permanentId,
                        agentHash: `test-${agentRecord.permanentId}`,
                        personaDescription: null,
                        initialMessage: null,
                        links: [],
                        capabilities: [],
                        samples: [],
                        knowledgeSources: [],
                        parameters: [],
                        meta: {},
                    } satisfies AgentBasicInformation),
            );
        },
        async getAgentPermanentId(agentNameOrPermanentId: string) {
            return findAgentRecord(agentNameOrPermanentId).permanentId as string_agent_permanent_id;
        },
        async getAgentSource(agentNameOrPermanentId: string) {
            return findAgentRecord(agentNameOrPermanentId).agentSource;
        },
    } as unknown as AgentCollection;
}

/**
 * Creates a compact-reference resolver and direct local importer for one mock collection.
 *
 * @param collection - Local source collection.
 * @param adamAgentUrl - Adam URL for implicit inheritance.
 * @returns Shared resolver and importer.
 */
async function createLocalInheritanceTestDependencies(collection: AgentCollection, adamAgentUrl: string) {
    const agentReferenceResolver = await createServerAgentReferenceResolver({
        agentCollection: collection,
        localServerUrl: 'https://local.example',
    });
    const agentSourceImporter = createLocalAgentSourceImporter({
        collection,
        localServerUrls: ['https://local.example'],
        adamAgentUrl: adamAgentUrl as string_agent_url,
        fallbackResolver: agentReferenceResolver,
    });

    return { agentReferenceResolver, agentSourceImporter };
}

afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    jest.restoreAllMocks();
});

describe('resolveAgentStateFromSource', () => {
    it('inherits from compact local FROM references without HTTP import', async () => {
        const adamAgentUrl = 'https://local.example/agents/adam';
        const collection = createMockAgentCollection([
            {
                agentName: 'Adam',
                permanentId: 'adam',
                agentSource: book`
                    Adam

                    FROM @Void
                    RULE Start from Adam.
                `,
            },
            {
                agentName: 'Basic',
                permanentId: 'basic-id',
                agentSource: book`
                    Basic

                    FROM @Void
                    RULE Follow the Basic parent rule.
                `,
            },
        ]);
        const { agentReferenceResolver, agentSourceImporter } = await createLocalInheritanceTestDependencies(
            collection,
            adamAgentUrl,
        );
        global.fetch = jest.fn(async () => {
            throw new Error('HTTP import should not be used for local inheritance.');
        }) as typeof fetch;

        const resolvedAgentState = await resolveAgentStateFromSource(
            book`
                Generic chatter

                FROM @Basic
                GOAL Empathetic and understanding support bot.
                CLOSED
            `,
            {
                adamAgentUrl: adamAgentUrl as string_agent_url,
                canonicalAgentUrl: 'https://local.example/agents/generic-chatter' as string_agent_url,
                agentReferenceResolver,
                agentSourceImporter,
            },
        );
        const modelRequirements = await createAgentModelRequirements(resolvedAgentState.resolvedAgentSource);

        expect(global.fetch).not.toHaveBeenCalled();
        expect(resolvedAgentState.resolvedAgentSource).toContain(
            'NOTE Inherited FROM https://local.example/agents/basic-id',
        );
        expect(modelRequirements.systemMessage).toContain('Follow the Basic parent rule.');
        expect(modelRequirements.systemMessage).toContain('Empathetic and understanding support bot.');
    });

    it('inherits from local Adam by default without HTTP import', async () => {
        const adamAgentUrl = 'https://local.example/agents/adam';
        const collection = createMockAgentCollection([
            {
                agentName: 'Adam',
                permanentId: 'adam',
                agentSource: book`
                    Adam

                    FROM @Void
                    RULE Start from Adam.
                `,
            },
        ]);
        const { agentReferenceResolver, agentSourceImporter } = await createLocalInheritanceTestDependencies(
            collection,
            adamAgentUrl,
        );
        global.fetch = jest.fn(async () => {
            throw new Error('HTTP import should not be used for local Adam inheritance.');
        }) as typeof fetch;

        const resolvedAgentState = await resolveAgentStateFromSource(
            book`
                Generic chatter

                GOAL Empathetic and understanding support bot.
            `,
            {
                adamAgentUrl: adamAgentUrl as string_agent_url,
                canonicalAgentUrl: 'https://local.example/agents/generic-chatter' as string_agent_url,
                agentReferenceResolver,
                agentSourceImporter,
            },
        );

        expect(global.fetch).not.toHaveBeenCalled();
        expect(resolvedAgentState.resolvedAgentSource).toContain(
            'NOTE Inherited Adam FROM https://local.example/agents/adam',
        );
        expect(resolvedAgentState.resolvedAgentSource).toContain('RULE Start from Adam.');
    });

    it('keeps FROM @Void as explicit no-parent inheritance', async () => {
        const adamAgentUrl = 'https://local.example/agents/adam';
        const collection = createMockAgentCollection([
            {
                agentName: 'Adam',
                permanentId: 'adam',
                agentSource: book`
                    Adam

                    FROM @Void
                    RULE Start from Adam.
                `,
            },
        ]);
        const { agentReferenceResolver, agentSourceImporter } = await createLocalInheritanceTestDependencies(
            collection,
            adamAgentUrl,
        );
        global.fetch = jest.fn(async () => {
            throw new Error('HTTP import should not be used for explicit no-parent inheritance.');
        }) as typeof fetch;

        const resolvedAgentState = await resolveAgentStateFromSource(
            book`
                Generic chatter

                FROM @Void
                GOAL Empathetic and understanding support bot.
            `,
            {
                adamAgentUrl: adamAgentUrl as string_agent_url,
                canonicalAgentUrl: 'https://local.example/agents/generic-chatter' as string_agent_url,
                agentReferenceResolver,
                agentSourceImporter,
            },
        );

        expect(global.fetch).not.toHaveBeenCalled();
        expect(resolvedAgentState.resolvedAgentSource).toContain('FROM @Void');
        expect(resolvedAgentState.resolvedAgentSource).not.toContain('RULE Start from Adam.');
    });

    it('inherits metadata and initial message from the resolved parent source', async () => {
        const parentAgentUrl = 'https://example.com/agents/parent-metadata';
        mockFetchRoutes({
            [`${parentAgentUrl}/api/book?recursionLevel=1`]: book`
                Parent Agent

                FROM VOID
                META IMAGE https://cdn.example.com/parent.png
                META DESCRIPTION Parent description
                META COLOR #123456
                META FONT Arial, sans-serif
                INITIAL MESSAGE Hello from parent.
            `,
        });

        const resolvedAgentState = await resolveAgentStateFromSource(
            `
                Child Agent

                FROM ${parentAgentUrl}
                RULE Answer shortly.
            ` as string_book,
            {
                adamAgentUrl: 'https://example.com/agents/adam',
                canonicalAgentUrl: 'https://local.example/agents/child',
            },
        );

        expect(resolvedAgentState.resolvedAgentProfile.meta.image).toBe('https://cdn.example.com/parent.png');
        expect(resolvedAgentState.resolvedAgentProfile.meta.description).toBe('Parent description');
        expect(resolvedAgentState.resolvedAgentProfile.meta.color).toBe('#123456');
        expect(resolvedAgentState.resolvedAgentProfile.meta.font).toBe('Arial, sans-serif');
        expect(resolvedAgentState.resolvedAgentProfile.initialMessage).toBe('Hello from parent.');
    });

    it('gives child overrides precedence while keeping inherited rules and commitments', async () => {
        const parentAgentUrl = 'https://example.com/agents/parent-overrides';
        mockFetchRoutes({
            [`${parentAgentUrl}/api/book?recursionLevel=1`]: book`
                Parent Agent

                FROM VOID
                USE BROWSER
                RULE Follow the parent rule.
                META COLOR #123456
                META FONT Arial, sans-serif
                INITIAL MESSAGE Hello from parent.
            `,
        });

        const resolvedAgentState = await resolveAgentStateFromSource(
            `
                Child Agent

                FROM ${parentAgentUrl}
                USE SEARCH ENGINE
                RULE Follow the child rule.
                META COLOR #654321
                INITIAL MESSAGE Hello from child.
            ` as string_book,
            {
                adamAgentUrl: 'https://example.com/agents/adam',
                canonicalAgentUrl: 'https://local.example/agents/child',
            },
        );
        const modelRequirements = await createAgentModelRequirements(resolvedAgentState.resolvedAgentSource);

        expect(resolvedAgentState.resolvedAgentProfile.meta.color).toBe('#654321');
        expect(resolvedAgentState.resolvedAgentProfile.meta.font).toBe('Arial, sans-serif');
        expect(resolvedAgentState.resolvedAgentProfile.initialMessage).toBe('Hello from child.');
        expect(
            resolvedAgentState.resolvedAgentProfile.capabilities.some((capability) => capability.type === 'browser'),
        ).toBe(true);
        expect(
            resolvedAgentState.resolvedAgentProfile.capabilities.some(
                (capability) => capability.type === 'search-engine',
            ),
        ).toBe(true);
        expect(modelRequirements.systemMessage).toContain('Follow the parent rule.');
        expect(modelRequirements.systemMessage).toContain('Follow the child rule.');
    });

    it('uses the child last GOAL for resolved profile text while keeping inherited commitments', async () => {
        const parentAgentUrl = 'https://example.com/agents/parent-goal';
        mockFetchRoutes({
            [`${parentAgentUrl}/api/book?recursionLevel=1`]: book`
                Parent Agent

                FROM VOID
                GOAL Parent goal.
                RULE Follow the parent rule.
            `,
        });

        const resolvedAgentState = await resolveAgentStateFromSource(
            `
                Child Agent

                FROM ${parentAgentUrl}
                PERSONA Deprecated child persona.
                GOAL Child goal.
                RULE Follow the child rule.
            ` as string_book,
            {
                adamAgentUrl: 'https://example.com/agents/adam',
                canonicalAgentUrl: 'https://local.example/agents/child',
            },
        );
        const modelRequirements = await createAgentModelRequirements(resolvedAgentState.resolvedAgentSource);

        expect(resolvedAgentState.resolvedAgentProfile.personaDescription).toBe('Child goal.');
        expect(modelRequirements.systemMessage).toContain('Child goal.');
        expect(modelRequirements.systemMessage).not.toContain('Parent goal.');
        expect(modelRequirements.systemMessage).toContain('Follow the parent rule.');
        expect(modelRequirements.systemMessage).toContain('Follow the child rule.');
    });
});
