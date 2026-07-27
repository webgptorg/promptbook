import { createAgentProjectDnsRecord } from './createAgentProjectDnsRecords';

describe('createAgentProjectDnsRecord', () => {
    it('creates an A record for one project domain', () => {
        expect(
            createAgentProjectDnsRecord({
                isCnameRecord: false,
                isWildcardDomain: false,
                projectDomain: 'ai-ta-krajta-web.s24.ptbk.io',
                publicIpAddress: '203.0.113.42',
                serverDomain: 's24.ptbk.io',
            }),
        ).toEqual({
            type: 'A',
            name: 'ai-ta-krajta-web.s24.ptbk.io',
            value: '203.0.113.42',
            note: 'Point this hostname directly to the VPS public IP address.',
        });
    });

    it('creates a wildcard CNAME alternative', () => {
        expect(
            createAgentProjectDnsRecord({
                isCnameRecord: true,
                isWildcardDomain: true,
                projectDomain: 'ai-ta-krajta-web.s24.ptbk.io',
                publicIpAddress: '203.0.113.42',
                serverDomain: 's24.ptbk.io',
            }),
        ).toEqual({
            type: 'CNAME',
            name: '*.s24.ptbk.io',
            value: 's24.ptbk.io',
            note: 'Use this only when `s24.ptbk.io` already resolves to this server.',
        });
    });

    it('shows a replacement placeholder when the VPS IP is unavailable', () => {
        expect(
            createAgentProjectDnsRecord({
                isCnameRecord: false,
                isWildcardDomain: true,
                projectDomain: 'ai-ta-krajta-web.s24.ptbk.io',
                publicIpAddress: null,
                serverDomain: 's24.ptbk.io',
            }).value,
        ).toBe('<VPS_PUBLIC_IP>');
    });
});
