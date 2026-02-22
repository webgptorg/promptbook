import { describe, expect, it } from '@jest/globals';
import { createCustomDomainMatchCandidates, createCustomDomainOrFilter } from './customDomainRouting';

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
});
