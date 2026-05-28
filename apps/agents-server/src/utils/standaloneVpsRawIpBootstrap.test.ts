import { isStandaloneVpsRawIpBootstrapActive } from './standaloneVpsRawIpBootstrap';

describe('isStandaloneVpsRawIpBootstrapActive', () => {
    it('returns true for an http raw-IP site URL that matches the configured VPS address', () => {
        expect(
            isStandaloneVpsRawIpBootstrapActive({
                nextPublicSiteUrl: 'http://203.0.113.42',
                publicIpAddress: '203.0.113.42',
            }),
        ).toBe(true);
    });

    it('returns false for a domain-based site URL', () => {
        expect(
            isStandaloneVpsRawIpBootstrapActive({
                nextPublicSiteUrl: 'https://agents.example.com',
                publicIpAddress: '203.0.113.42',
            }),
        ).toBe(false);
    });

    it('returns false when the raw-IP site URL does not match the configured VPS address', () => {
        expect(
            isStandaloneVpsRawIpBootstrapActive({
                nextPublicSiteUrl: 'http://198.51.100.10',
                publicIpAddress: '203.0.113.42',
            }),
        ).toBe(false);
    });
});
