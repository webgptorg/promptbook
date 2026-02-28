import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from '@jest/globals';
import {
    createCustomDomainMatchCandidates,
    createCustomDomainOrFilter,
    resolveCustomDomainAgent,
} from './customDomainRouting';

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
            const supabase = createMockSupabase({
                server_PavolHejny_Agent: {
                    data: { agentName: 'my-agent' },
                },
            });

            const resolution = await resolveCustomDomainAgent('search.ptbk.io', supabase, [
                'pavol-hejny.ptbk.io',
            ]);

            expect(resolution).toEqual({
                serverHost: 'pavol-hejny.ptbk.io',
                agentName: 'my-agent',
            });
        });

        it('skips servers that throw errors before returning the first match', async () => {
            const supabase = createMockSupabase({
                server_First_Agent: { shouldThrow: true },
                server_Second_Agent: { data: { agentName: 'second-agent' } },
            });

            const resolution = await resolveCustomDomainAgent('search.ptbk.io', supabase, [
                'first.ptbk.io',
                'second.ptbk.io',
            ]);

            expect(resolution).toEqual({
                serverHost: 'second.ptbk.io',
                agentName: 'second-agent',
            });
        });
    });
});

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
