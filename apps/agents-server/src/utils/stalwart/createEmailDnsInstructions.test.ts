import { describe, expect, it } from '@jest/globals';
import { createEmailDnsInstructions } from './createEmailDnsInstructions';

describe('createEmailDnsInstructions', () => {
    it('uses the supplied VPS public IP address for the mail and MTA-STS hosts', () => {
        const instructions = createEmailDnsInstructions('agents.example.com', '203.0.113.42');

        expect(instructions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    type: 'A',
                    name: 'mail.agents.example.com',
                    value: '203.0.113.42',
                }),
                expect.objectContaining({
                    type: 'MX',
                    name: 'agents.example.com',
                    value: '10 mail.agents.example.com.',
                }),
                expect.objectContaining({
                    type: 'A',
                    name: 'mta-sts.agents.example.com',
                    value: '203.0.113.42',
                }),
            ]),
        );
    });

    it('keeps the public-IP placeholder when the VPS address is unavailable', () => {
        const instructions = createEmailDnsInstructions('agents.example.com');

        expect(instructions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    type: 'A',
                    name: 'mail.agents.example.com',
                    value: '<VPS_PUBLIC_IP>',
                }),
            ]),
        );
    });
});
