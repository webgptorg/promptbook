import { describe, expect, it } from '@jest/globals';
import { CLOUDFLARE_DNS_RECORD_PROXIED, CLOUDFLARE_DNS_RECORD_TTL_AUTOMATIC } from './CloudflareApi';
import { createCloudflareDnsRecordRequestBody } from './createCloudflareDnsRecordRequestBody';

/**
 * Record values which are the same for every tested request body.
 */
const CLOUDFLARE_DNS_RECORD_WRITE_DEFAULTS = {
    zoneId: 'zone-id',
    proxied: CLOUDFLARE_DNS_RECORD_PROXIED,
    ttl: CLOUDFLARE_DNS_RECORD_TTL_AUTOMATIC,
    comment: 'Managed by the Promptbook Agents Server DNS wizard',
};

describe('createCloudflareDnsRecordRequestBody', () => {
    it('sends the proxy status only for record types which Cloudflare can proxy', () => {
        expect(
            createCloudflareDnsRecordRequestBody({
                ...CLOUDFLARE_DNS_RECORD_WRITE_DEFAULTS,
                type: 'A',
                name: 'agents.example.com',
                content: '203.0.113.42',
            }),
        ).toMatchObject({ content: '203.0.113.42', proxied: false });

        expect(
            createCloudflareDnsRecordRequestBody({
                ...CLOUDFLARE_DNS_RECORD_WRITE_DEFAULTS,
                type: 'TXT',
                name: 'example.com',
                content: 'v=spf1 mx -all',
            }),
        ).not.toHaveProperty('proxied');
    });

    it('splits the mail exchanger priority out of the record value', () => {
        expect(
            createCloudflareDnsRecordRequestBody({
                ...CLOUDFLARE_DNS_RECORD_WRITE_DEFAULTS,
                type: 'MX',
                name: 'example.com',
                content: '10 mail.example.com.',
            }),
        ).toMatchObject({ content: 'mail.example.com', priority: 10 });
    });

    it('sends certificate authority records as structured data', () => {
        expect(
            createCloudflareDnsRecordRequestBody({
                ...CLOUDFLARE_DNS_RECORD_WRITE_DEFAULTS,
                type: 'CAA',
                name: 'example.com',
                content: '0 issue "letsencrypt.org"',
            }),
        ).toMatchObject({ data: { flags: 0, tag: 'issue', value: 'letsencrypt.org' } });
    });
});
