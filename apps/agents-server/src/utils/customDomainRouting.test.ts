import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { book } from '../../../../src/_packages/core.index';
import {
    createCustomDomainMatchCandidates,
    createCustomDomainOrFilter,
    resolveCustomDomainAgent,
} from './customDomainRouting';
import { SERVER_ENVIRONMENT, type ServerRecord } from './serverRegistry';

jest.mock('./getFederatedServers', () => ({
    getFederatedServers: jest.fn(async () => []),
}));

jest.mock('./getWellKnownAgentUrl', () => ({
    getWellKnownAgentUrl: jest.fn(async () => 'https://core-test.ptbk.io/agents/adam'),
}));

/**
 * Original fetch implementation restored after each test.
 */
const ORIGINAL_FETCH = global.fetch;

afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    jest.restoreAllMocks();
});

describe('customDomainRouting', () => {
    it('builds normalized domain and link candidates from host header', () => {
        const candidates = createCustomDomainMatchCandidates('Sub.Example.com:4440');

        expect(candidates.domainCandidates).toEqual([
            'sub.example.com',
            'https://sub.example.com',
            'http://sub.example.com',
        ]);
        expect(candidates.linkCandidates).toEqual([
            'sub.example.com:4440',
            'sub.example.com',
            'https://sub.example.com',
            'http://sub.example.com',
        ]);
    });

    it('creates OR filter containing META DOMAIN and META LINK expressions', () => {
        const orFilter = createCustomDomainOrFilter('my-agent.com');

        expect(orFilter).toContain('agentProfile.cs.{"meta":{"domain":"my-agent.com"}}');
        expect(orFilter).toContain('agentProfile.cs.{"meta":{"domain":"https://my-agent.com"}}');
        expect(orFilter).toContain('agentProfile.cs.{"links":["my-agent.com"]}');
    });

    it('returns null for invalid host values', () => {
        expect(createCustomDomainOrFilter('invalid host value')).toBe(null);
    });

    describe('resolveCustomDomainAgent', () => {
        it('returns the matching server and agent', async () => {
            const server = createServerRecord({
                id: 1,
                name: 'pavol-hejny',
                environment: SERVER_ENVIRONMENT.PRODUCTION,
                domain: 'pavol-hejny.ptbk.io',
                tablePrefix: 'server_PavolHejny_',
            });
            const supabase = createMockSupabase({
                server_PavolHejny_Agent: {
                    data: [
                        createAgentRow({
                            agentName: 'my-agent',
                            permanentId: 'my-agent',
                            agentSource: book`
                                My Agent

                                FROM VOID
                                META DOMAIN search.ptbk.io
                            `,
                        }),
                    ],
                },
            });

            const resolution = await resolveCustomDomainAgent('search.ptbk.io', supabase, [server]);

            expect(resolution).toEqual({
                server,
                agentName: 'my-agent',
            });
        });

        it('skips servers that throw errors before returning the first match', async () => {
            const firstServer = createServerRecord({
                id: 1,
                name: 'first',
                environment: SERVER_ENVIRONMENT.PREVIEW,
                domain: 'first.ptbk.io',
                tablePrefix: 'server_First_',
            });
            const secondServer = createServerRecord({
                id: 2,
                name: 'second',
                environment: SERVER_ENVIRONMENT.PREVIEW,
                domain: 'second.ptbk.io',
                tablePrefix: 'server_Second_',
            });
            const supabase = createMockSupabase({
                server_First_Agent: { shouldThrow: true },
                server_Second_Agent: {
                    data: [
                        createAgentRow({
                            agentName: 'second-agent',
                            permanentId: 'second-agent',
                            agentSource: book`
                                Second Agent

                                FROM VOID
                                META LINK search.ptbk.io
                            `,
                        }),
                    ],
                },
            });

            const resolution = await resolveCustomDomainAgent('search.ptbk.io', supabase, [firstServer, secondServer]);

            expect(resolution).toEqual({
                server: secondServer,
                agentName: 'second-agent',
            });
        });

        it('matches inherited domain metadata from the resolved parent source', async () => {
            const server = createServerRecord({
                id: 1,
                name: 'pavol-hejny',
                environment: SERVER_ENVIRONMENT.PRODUCTION,
                domain: 'pavol-hejny.ptbk.io',
                tablePrefix: 'server_PavolHejny_',
            });
            const parentAgentUrl = 'https://core-test.ptbk.io/agents/parent-agent';
            const supabase = createMockSupabase({
                server_PavolHejny_Agent: {
                    data: [
                        createAgentRow({
                            agentName: 'Child Agent',
                            permanentId: 'child-agent',
                            agentSource: `
                                Child Agent

                                FROM ${parentAgentUrl}
                                RULE Child rule.
                            `,
                        }),
                    ],
                },
            });

            global.fetch = jest.fn(async (input: RequestInfo | URL) => {
                const url = new URL(String(input));
                const normalizedUrl = url.pathname.endsWith('/api/book')
                    ? `${url.origin}${url.pathname}?recursionLevel=${url.searchParams.get('recursionLevel') || ''}`
                    : url.href;

                if (normalizedUrl !== `${parentAgentUrl}/api/book?recursionLevel=1`) {
                    throw new Error(`Unexpected fetch URL: ${url.href}`);
                }

                return new Response(
                    book`
                        Parent Agent

                        FROM VOID
                        META DOMAIN inherited.ptbk.io
                    `,
                    {
                        status: 200,
                        headers: { 'content-type': 'text/plain' },
                    },
                );
            }) as typeof fetch;

            const resolution = await resolveCustomDomainAgent('inherited.ptbk.io', supabase, [server]);

            expect(resolution).toEqual({
                server,
                agentName: 'Child Agent',
            });
        });
    });
});

/**
 * Creates one normalized test server record.
 *
 * @param partialServer - Overridden record fields.
 * @returns Fully populated server record.
 */
function createServerRecord(partialServer: Partial<ServerRecord>): ServerRecord {
    return {
        id: partialServer.id ?? 1,
        name: partialServer.name ?? 'test-server',
        environment: partialServer.environment ?? SERVER_ENVIRONMENT.PREVIEW,
        domain: partialServer.domain ?? 'test.ptbk.io',
        tablePrefix: partialServer.tablePrefix ?? 'server_Test_',
        createdAt: partialServer.createdAt ?? '2026-03-11T00:00:00.000Z',
        updatedAt: partialServer.updatedAt ?? '2026-03-11T00:00:00.000Z',
    };
}

/**
 * Creates a minimal Supabase mock for custom-domain tests.
 *
 * @param results - Per-table query results.
 * @returns Mocked Supabase client.
 */
function createMockSupabase(
    results: Record<string, { data?: Array<ReturnType<typeof createAgentRow>> | null; shouldThrow?: boolean }>,
): SupabaseClient {
    return {
        from(tableName: string) {
            const builder = {
                select() {
                    return builder;
                },
                is() {
                    return builder;
                },
                or() {
                    return builder;
                },
                limit() {
                    return builder;
                },
                async maybeSingle() {
                    const entry = results[tableName];
                    if (entry?.shouldThrow) {
                        throw new Error('boom');
                    }
                    return { data: entry?.data?.[0] ?? null };
                },
                then(
                    resolve: (value: { data: Array<ReturnType<typeof createAgentRow>> | null; error: null }) => unknown,
                    reject?: (reason: unknown) => unknown,
                ) {
                    const entry = results[tableName];
                    return (
                        entry?.shouldThrow
                            ? Promise.reject(new Error('boom'))
                            : Promise.resolve({ data: entry?.data ?? null, error: null })
                    ).then(resolve, reject);
                },
            };
            return builder;
        },
    } as unknown as SupabaseClient;
}

/**
 * Creates one minimal stored-agent row for routing tests.
 *
 * @param partialRow - Overridden row fields.
 * @returns Stored agent row compatible with both raw queries and resolver initialization.
 */
function createAgentRow(partialRow: {
    agentName: string;
    permanentId: string;
    agentSource: string;
}): {
    agentName: string;
    permanentId: string;
    agentSource: string;
    agentProfile: {
        agentName: string;
        meta: Record<string, string>;
        capabilities: [];
        links: [];
        parameters: [];
        samples: [];
        knowledgeSources: [];
        agentHash: string;
        initialMessage: null;
        personaDescription: null;
    };
} {
    return {
        agentName: partialRow.agentName,
        permanentId: partialRow.permanentId,
        agentSource: partialRow.agentSource,
        agentProfile: {
            agentName: partialRow.agentName,
            agentHash: `hash-${partialRow.permanentId}`,
            meta: {
                fullname: partialRow.agentName,
            },
            capabilities: [],
            links: [],
            parameters: [],
            samples: [],
            knowledgeSources: [],
            initialMessage: null,
            personaDescription: null,
        },
    };
}
