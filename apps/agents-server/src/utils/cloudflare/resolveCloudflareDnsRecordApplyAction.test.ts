import { describe, expect, it } from '@jest/globals';
import type { CloudflareDnsRecord } from './CloudflareApi';
import { resolveCloudflareDnsRecordApplyAction } from './resolveCloudflareDnsRecordApplyAction';

/**
 * Creates one existing Cloudflare record for the test cases.
 *
 * @param record - Record values which matter for the tested decision.
 * @returns Cloudflare DNS record.
 */
function createExistingCloudflareDnsRecord(record: Partial<CloudflareDnsRecord>): CloudflareDnsRecord {
    return {
        id: 'record-id',
        type: 'A',
        name: 'agents.example.com',
        content: '203.0.113.42',
        ...record,
    };
}

describe('resolveCloudflareDnsRecordApplyAction', () => {
    it('creates records which are missing in Cloudflare', () => {
        expect(
            resolveCloudflareDnsRecordApplyAction(
                { type: 'A', name: 'agents.example.com', value: '203.0.113.42', note: null },
                [],
            ),
        ).toEqual({ kind: 'create' });
    });

    it('leaves already configured records untouched', () => {
        expect(
            resolveCloudflareDnsRecordApplyAction(
                { type: 'CNAME', name: 'agents.example.com', value: 'live.example.com', note: null },
                [
                    createExistingCloudflareDnsRecord({
                        type: 'CNAME',
                        content: 'live.example.com.',
                    }),
                ],
            ),
        ).toEqual({ kind: 'unchanged' });
    });

    it('overwrites the single existing record of a hostname which holds only one value', () => {
        expect(
            resolveCloudflareDnsRecordApplyAction(
                { type: 'A', name: 'agents.example.com', value: '203.0.113.42', note: null },
                [createExistingCloudflareDnsRecord({ id: 'outdated-record', content: '198.51.100.7' })],
            ),
        ).toEqual({ kind: 'update', recordId: 'outdated-record' });
    });

    it('overwrites an outdated policy text record of the same policy', () => {
        expect(
            resolveCloudflareDnsRecordApplyAction(
                { type: 'TXT', name: 'example.com', value: 'v=spf1 mx -all', note: null },
                [
                    createExistingCloudflareDnsRecord({
                        id: 'outdated-spf',
                        type: 'TXT',
                        name: 'example.com',
                        content: '"v=spf1 include:legacy.example.net ~all"',
                    }),
                ],
            ),
        ).toEqual({ kind: 'update', recordId: 'outdated-spf' });
    });

    it('keeps unrelated text records of the same hostname', () => {
        expect(
            resolveCloudflareDnsRecordApplyAction(
                { type: 'TXT', name: 'example.com', value: 'v=spf1 mx -all', note: null },
                [
                    createExistingCloudflareDnsRecord({
                        type: 'TXT',
                        name: 'example.com',
                        content: 'google-site-verification=token',
                    }),
                ],
            ).kind,
        ).toBe('skip');
    });

    it('matches mail exchanger records by their host and priority', () => {
        const mailExchangerRecord = { type: 'MX', name: 'example.com', value: '10 mail.example.com.', note: null };

        expect(
            resolveCloudflareDnsRecordApplyAction(mailExchangerRecord, [
                createExistingCloudflareDnsRecord({
                    type: 'MX',
                    name: 'example.com',
                    content: 'mail.example.com',
                    priority: 10,
                }),
            ]),
        ).toEqual({ kind: 'unchanged' });

        expect(
            resolveCloudflareDnsRecordApplyAction(mailExchangerRecord, [
                createExistingCloudflareDnsRecord({
                    type: 'MX',
                    name: 'example.com',
                    content: 'mail.other.example.net',
                    priority: 10,
                }),
            ]).kind,
        ).toBe('skip');
    });

    it('never guesses which of many conflicting records should be overwritten', () => {
        expect(
            resolveCloudflareDnsRecordApplyAction(
                { type: 'A', name: 'agents.example.com', value: '203.0.113.42', note: null },
                [
                    createExistingCloudflareDnsRecord({ id: 'first', content: '198.51.100.7' }),
                    createExistingCloudflareDnsRecord({ id: 'second', content: '198.51.100.8' }),
                ],
            ).kind,
        ).toBe('skip');
    });
});
