import { describe, expect, it } from '@jest/globals';
import { normalizeDomainForMatching } from './normalizeDomainForMatching';

describe('normalizeDomainForMatching', () => {
    it('normalizes plain domain names', () => {
        expect(normalizeDomainForMatching('my-agent.com')).toBe('my-agent.com');
        expect(normalizeDomainForMatching('Sub.Example.COM')).toBe('sub.example.com');
    });

    it('normalizes url-like values to hostname', () => {
        expect(normalizeDomainForMatching('https://my-agent.com/path?x=1')).toBe('my-agent.com');
        expect(normalizeDomainForMatching('http://example.com:4440/abc')).toBe('example.com');
    });

    it('returns null for invalid values', () => {
        expect(normalizeDomainForMatching('')).toBe(null);
        expect(normalizeDomainForMatching('not a domain with spaces')).toBe(null);
    });
});
