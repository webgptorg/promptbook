import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from '@jest/globals';
import {
    createCustomDomainMatchCandidates,
    createCustomDomainOrFilter,
    resolveCustomDomainAgent,
} from './customDomainRouting';
import { SERVER_ENVIRONMENT, type ServerRecord } from './serverRegistry';

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
                    data: { agentName: 'my-agent' },
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
                server_Second_Agent: { data: { agentName: 'second-agent' } },
            });

            const resolution = await resolveCustomDomainAgent('search.ptbk.io', supabase, [firstServer, secondServer]);

            expect(resolution).toEqual({
                server: secondServer,
                agentName: 'second-agent',
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
    results: Record<string, { data?: { agentName: string } | null; shouldThrow?: boolean }>,
): SupabaseClient {
    return {
        from(tableName: string) {
            const builder = {
                select() {
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
                    return { data: entry?.data ?? null };
                },
            };
            return builder;
        },
    } as unknown as SupabaseClient;
}
