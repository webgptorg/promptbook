import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { ParseError, book, validateBook } from '../../../../src/_packages/core.index'; // <- [🚾]
import type { string_book } from '../../../../src/_packages/types.index'; // <- [🚾]
import type { AgentCollection } from '../../../../src/collection/agent-collection/AgentCollection';
import {
    DEFAULT_FEDERATED_AGENT_IMPORT_CONFIGURATION,
    FEDERATED_AGENT_IMPORT_MAX_ATTEMPTS,
} from '../constants/federatedAgentImport';
import { createServerAgentReferenceResolver } from './agentReferenceResolver/createServerAgentReferenceResolver';
import { resolveInheritedAgentSource } from './resolveInheritedAgentSource';

/**
 * Original fetch implementation restored after each test.
 */
const ORIGINAL_FETCH = global.fetch;

/**
 * Mocked HTTP response definition keyed by normalized URL.
 */
type MockFetchRoute = {
    readonly body: string | Record<string, unknown>;
    readonly contentType?: string;
    readonly status?: number;
    readonly headers?: Record<string, string>;
};

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

/**
 * Normalizes URLs used by `importAgent` so tests can ignore revalidation/cycle query params.
 *
 * @param rawUrl - Raw request URL.
 * @returns Stable key for the mocked response map.
 */
function normalizeFetchKey(rawUrl: string): string {
    const url = new URL(rawUrl);

    if (url.pathname.endsWith('/api/book')) {
        return `${url.origin}${url.pathname}?recursionLevel=${url.searchParams.get('recursionLevel') || ''}`;
    }

    return `${url.origin}${url.pathname}`;
}

/**
 * Installs a deterministic `fetch` mock for remote/local agent imports.
 *
 * @param routes - Mocked responses keyed by normalized URL.
 */
function mockFetchRoutes(routes: Record<string, MockFetchRoute>): void {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
        const requestUrl = String(input);
        const route = routes[normalizeFetchKey(requestUrl)];

        if (!route) {
            throw new Error(`Unexpected fetch URL: ${requestUrl}`);
        }

        return new Response(typeof route.body === 'string' ? route.body : JSON.stringify(route.body), {
            status: route.status || 200,
            headers: {
                'content-type':
                    route.contentType || (typeof route.body === 'string' ? 'text/plain' : 'application/json'),
                ...(route.headers || {}),
            },
        });
    }) as typeof fetch;
}

afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    jest.restoreAllMocks();
});

describe('how `resolveInheritedAgentSource` works', () => {
    it('should resolve explicit `FROM` commitment in agent', async () => {
        mockFetchRoutes({
            'https://core-test.ptbk.io/agents/test-0/api/book?recursionLevel=1': {
                body: book`
                    Test Parent

                    FROM VOID
                    NONCE 0
                `,
            },
        });

        await expect(
            resolveInheritedAgentSource(
                book`
                    Beatrice

                    FROM https://core-test.ptbk.io/agents/test-0
                    LANGUAGE Italian
                `,
                {
                    currentAgentUrl: 'https://local.example/agents/beatrice',
                },
            ),
        ).resolves.toEqual(
            book`
                Beatrice

                NOTE Inherited FROM https://core-test.ptbk.io/agents/test-0
                FROM VOID
                NONCE 0

                NOTE ===========

                LANGUAGE Italian
            `,
        );
    });

    it('should resolve implicit default inheritance from Adam', async () => {
        mockFetchRoutes({
            'https://core-test.ptbk.io/agents/adam/api/book?recursionLevel=1': {
                body: book`
                    Adam

                    FROM VOID
                    RULE Start from Adam.
                `,
            },
        });

        const resolvedAgentSource = await resolveInheritedAgentSource(
            book`
                Beatrice

                LANGUAGE Italian
            `,
            {
                adamAgentUrl: 'https://core-test.ptbk.io/agents/adam',
                currentAgentUrl: 'https://local.example/agents/beatrice',
            },
        );

        expect(resolvedAgentSource).toContain('NOTE Inherited Adam FROM https://core-test.ptbk.io/agents/adam');
        expect(resolvedAgentSource).toContain('RULE Start from Adam.');
        expect(resolvedAgentSource).toContain('LANGUAGE Italian');
    });

    it('should treat a book without `FROM` exactly like an explicit `FROM @Adam` / `FROM {Adam}`', async () => {
        const localAdamAgentUrl = 'https://local.example/agents/adam-1';

        /**
         * Resolves one of the three equivalent books against the same local Adam agent.
         *
         * @param agentSource - Book to resolve.
         * @returns Resolved source with the implicit-inheritance note normalized to the explicit one.
         */
        async function resolveAgainstLocalAdam(agentSource: string_book): Promise<string> {
            const agentReferenceResolver = await createServerAgentReferenceResolver({
                agentCollection: createMockAgentCollection([{ agentName: 'Adam', permanentId: 'adam-1' }]),
                localServerUrl: 'https://local.example',
            });

            mockFetchRoutes({
                [`${localAdamAgentUrl}/api/book?recursionLevel=1`]: {
                    body: book`
                        Adam

                        FROM VOID
                        RULE Start from Adam.
                    `,
                },
            });

            const resolvedAgentSource = await resolveInheritedAgentSource(agentSource, {
                agentReferenceResolver,
                adamAgentUrl: localAdamAgentUrl,
                currentAgentUrl: 'https://local.example/agents/generic-chatter',
            });

            // Note: The implicit ancestor is only labeled differently, everything else must match byte for byte.
            return resolvedAgentSource.split('NOTE Inherited Adam FROM ').join('NOTE Inherited FROM ');
        }

        const resolvedWithoutFrom = await resolveAgainstLocalAdam(book`
            Generic chatter

            GOAL Keep your projects up to date
            CLOSED
        `);
        const resolvedWithAtAdam = await resolveAgainstLocalAdam(book`
            Generic chatter

            FROM @Adam
            GOAL Keep your projects up to date
            CLOSED
        `);
        const resolvedWithBracedAdam = await resolveAgainstLocalAdam(book`
            Generic chatter

            FROM {Adam}
            GOAL Keep your projects up to date
            CLOSED
        `);

        expect(resolvedWithoutFrom).toContain('RULE Start from Adam.');
        expect(resolvedWithoutFrom).toContain('GOAL Keep your projects up to date');
        expect(resolvedWithAtAdam).toBe(resolvedWithoutFrom);
        expect(resolvedWithBracedAdam).toBe(resolvedWithoutFrom);
    });

    it('should disable inheritance completely via `FROM @Null` / `FROM {null}`', async () => {
        for (const voidReference of ['@Null', '{null}']) {
            const agentReferenceResolver = await createServerAgentReferenceResolver({
                agentCollection: createMockAgentCollection([{ agentName: 'Adam', permanentId: 'adam-1' }]),
                localServerUrl: 'https://local.example',
            });

            const resolvedAgentSource = await resolveInheritedAgentSource(
                validateBook(
                    spaceTrim(`
                        Generic chatter

                        FROM ${voidReference}
                        GOAL Keep your projects up to date
                        CLOSED
                    `),
                ),
                {
                    agentReferenceResolver,
                    adamAgentUrl: 'https://local.example/agents/adam-1',
                    currentAgentUrl: 'https://local.example/agents/generic-chatter',
                },
            );

            expect(resolvedAgentSource).not.toContain('Inherited');
            expect(resolvedAgentSource).toContain(`FROM ${voidReference}`);
            expect(resolvedAgentSource).toContain('GOAL Keep your projects up to date');
        }
    });

    it('should let the last `FROM` override every earlier one', async () => {
        const effectiveParentAgentUrl = 'https://core-test.ptbk.io/agents/effective-parent';
        const overriddenParentAgentUrl = 'https://core-test.ptbk.io/agents/overridden-parent';

        // Note: The overridden parent is deliberately not mocked, so resolving it at all would fail the test loudly.
        mockFetchRoutes({
            [`${effectiveParentAgentUrl}/api/book?recursionLevel=1`]: {
                body: book`
                    Effective Parent

                    FROM VOID
                    RULE Rule of the effective parent.
                `,
            },
        });

        const resolvedWithOverriddenFrom = await resolveInheritedAgentSource(
            validateBook(
                spaceTrim(`
                    Beatrice

                    FROM ${overriddenParentAgentUrl}
                    LANGUAGE Italian
                    FROM ${effectiveParentAgentUrl}
                `),
            ),
            {
                currentAgentUrl: 'https://local.example/agents/beatrice',
            },
        );
        const resolvedWithSingleFrom = await resolveInheritedAgentSource(
            validateBook(
                spaceTrim(`
                    Beatrice

                    LANGUAGE Italian
                    FROM ${effectiveParentAgentUrl}
                `),
            ),
            {
                currentAgentUrl: 'https://local.example/agents/beatrice',
            },
        );

        expect(resolvedWithOverriddenFrom).toContain(`NOTE Inherited FROM ${effectiveParentAgentUrl}`);
        expect(resolvedWithOverriddenFrom).toContain('RULE Rule of the effective parent.');
        expect(resolvedWithOverriddenFrom).toContain('LANGUAGE Italian');
        expect(resolvedWithOverriddenFrom).not.toContain(overriddenParentAgentUrl);
        expect(resolvedWithOverriddenFrom).toBe(resolvedWithSingleFrom);
    });

    it('should resolve explicit no-parent inheritance via `FROM VOID`', async () => {
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

    it('should resolve compact local parent references', async () => {
        const agentReferenceResolver = await createServerAgentReferenceResolver({
            agentCollection: createMockAgentCollection([{ agentName: 'Local Parent', permanentId: 'parent-1' }]),
            localServerUrl: 'https://local.example',
        });

        mockFetchRoutes({
            'https://local.example/agents/parent-1/api/book?recursionLevel=1': {
                body: book`
                    Local Parent

                    FROM VOID
                    RULE Parent from local server.
                `,
            },
        });

        const resolvedAgentSource = await resolveInheritedAgentSource(
            book`
                Child Agent

                FROM {Local Parent}
                RULE Child rule.
            `,
            {
                agentReferenceResolver,
                adamAgentUrl: 'https://core-test.ptbk.io/agents/adam',
                currentAgentUrl: 'https://local.example/agents/child-1',
            },
        );

        expect(resolvedAgentSource).toContain('NOTE Inherited FROM https://local.example/agents/parent-1');
        expect(resolvedAgentSource).toContain('RULE Parent from local server.');
        expect(resolvedAgentSource).toContain('RULE Child rule.');
    });

    it('should resolve compact federated parent references', async () => {
        const agentReferenceResolver = await createServerAgentReferenceResolver({
            agentCollection: createMockAgentCollection([]),
            localServerUrl: 'https://local.example',
            federatedServers: ['https://federated.example'],
        });

        mockFetchRoutes({
            'https://federated.example/api/agents': {
                body: {
                    agents: [{ agentName: 'Remote Parent', permanentId: 'remote-parent' }],
                },
                contentType: 'application/json',
            },
            'https://federated.example/agents/remote-parent/api/book?recursionLevel=1': {
                body: book`
                    Remote Parent

                    FROM VOID
                    RULE Parent from federated server.
                `,
            },
        });

        const resolvedAgentSource = await resolveInheritedAgentSource(
            book`
                Child Agent

                FROM {Remote Parent}
                RULE Child rule.
            `,
            {
                agentReferenceResolver,
                adamAgentUrl: 'https://core-test.ptbk.io/agents/adam',
                currentAgentUrl: 'https://local.example/agents/child-1',
            },
        );

        expect(resolvedAgentSource).toContain('NOTE Inherited FROM https://federated.example/agents/remote-parent');
        expect(resolvedAgentSource).toContain('RULE Parent from federated server.');
        expect(resolvedAgentSource).toContain('RULE Child rule.');
    });

    it('should embed fallback source after failed default Adam retries', async () => {
        mockFetchRoutes({
            'https://core-test.ptbk.io/agents/adam/api/book?recursionLevel=1': {
                body: {
                    name: 'NotFoundError',
                    message: 'Agent not found',
                    stack: '',
                },
                contentType: 'application/json',
                status: 404,
            },
        });

        const resolvedAgentSource = await resolveInheritedAgentSource(
            book`
                Beatrice

                LANGUAGE Italian
            `,
            {
                adamAgentUrl: 'https://core-test.ptbk.io/agents/adam',
                currentAgentUrl: 'https://local.example/agents/beatrice',
                federatedAgentImportConfiguration: {
                    ...DEFAULT_FEDERATED_AGENT_IMPORT_CONFIGURATION,
                    retryDelayMs: 0,
                },
            },
        );

        expect(global.fetch).toHaveBeenCalledTimes(FEDERATED_AGENT_IMPORT_MAX_ATTEMPTS);
        expect(resolvedAgentSource).toContain('NOTE Inherited Adam FROM https://core-test.ptbk.io/agents/adam');
        expect(resolvedAgentSource).toContain(
            'NOTE This agent was supposed to be imported from https://core-test.ptbk.io/agents/adam, but it can not be loaded after 3 attempts because of Agent not found',
        );
        expect(resolvedAgentSource).toContain('LANGUAGE Italian');
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
                currentAgentUrl: 'https://local.example/agents/beatrice',
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
                currentAgentUrl: 'https://local.example/agents/beatrice',
            },
        );

        expect(resolvedAgentSource).toContain(
            'NOTE Referenced agent "Unknown Source" in IMPORT commitment was not found. Import skipped.',
        );
        expect(resolvedAgentSource).toContain('LANGUAGE Italian');
    });

    it('should embed fallback source after failed remote IMPORT retries', async () => {
        mockFetchRoutes({
            'https://federated.example/agents/missing-source/api/book?recursionLevel=1': {
                body: {
                    name: 'NotFoundError',
                    message: 'Remote import unavailable',
                    stack: '',
                },
                contentType: 'application/json',
                status: 404,
            },
        });

        const resolvedAgentSource = await resolveInheritedAgentSource(
            book`
                Beatrice

                FROM VOID
                IMPORT https://federated.example/agents/missing-source
                LANGUAGE Italian
            `,
            {
                currentAgentUrl: 'https://local.example/agents/beatrice',
                federatedAgentImportConfiguration: {
                    ...DEFAULT_FEDERATED_AGENT_IMPORT_CONFIGURATION,
                    retryDelayMs: 0,
                },
            },
        );

        expect(global.fetch).toHaveBeenCalledTimes(FEDERATED_AGENT_IMPORT_MAX_ATTEMPTS);
        expect(resolvedAgentSource).toContain('NOTE Imported from https://federated.example/agents/missing-source');
        expect(resolvedAgentSource).toContain(
            'NOTE This agent was supposed to be imported from https://federated.example/agents/missing-source, but it can not be loaded after 3 attempts because of Remote import unavailable',
        );
        expect(resolvedAgentSource).toContain('LANGUAGE Italian');
    });

    it('should fail safely on inheritance cycles', async () => {
        await expect(
            resolveInheritedAgentSource(
                book`
                    Cyclic Agent

                    FROM https://local.example/agents/cyclic
                `,
                {
                    currentAgentUrl: 'https://local.example/agents/cyclic',
                },
            ),
        ).rejects.toBeInstanceOf(ParseError);
    });

    it('should detect self-cycles when canonical and name-based URLs refer to the same agent', async () => {
        await expect(
            resolveInheritedAgentSource(
                book`
                    Recursive 0

                    FROM https://core-test.ptbk.io/agents/recursive-0
                `,
                {
                    currentAgentUrl: 'https://core-test.ptbk.io/agents/perm-recursive-0',
                    currentAgentAliases: ['https://core-test.ptbk.io/agents/recursive-0'],
                },
            ),
        ).rejects.toBeInstanceOf(ParseError);
    });

    it('should not make Adam implicitly inherit from itself through an agent URL alias', async () => {
        const adamAgentUrl = 'https://local.example/agents/adam';
        const agentSourceImporter = jest.fn();

        const resolvedAgentSource = await resolveInheritedAgentSource(
            book`
                Adam

                RULE Adam rule.
            `,
            {
                adamAgentUrl,
                currentAgentUrl: 'https://local.example/agents/adam-permanent-id',
                currentAgentAliases: [adamAgentUrl],
                agentSourceImporter,
            },
        );

        expect(agentSourceImporter).not.toHaveBeenCalled();
        expect(resolvedAgentSource).toContain('RULE Adam rule.');
        expect(resolvedAgentSource).not.toContain('Inherited Adam FROM');
    });
});
