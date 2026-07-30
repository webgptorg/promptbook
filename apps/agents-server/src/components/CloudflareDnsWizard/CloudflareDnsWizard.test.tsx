/** @jest-environment jsdom */

import { describe, expect, it } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import { CloudflareDnsWizard } from './CloudflareDnsWizard';

describe('CloudflareDnsWizard', () => {
    it('guides administrators through adding one direct DNS record', () => {
        render(
            <CloudflareDnsWizard
                domain="agents.example.com"
                recordSelection="one"
                records={[
                    {
                        type: 'A',
                        name: 'agents.example.com',
                        value: '203.0.113.42',
                        note: null,
                    },
                ]}
            />,
        );

        expect(screen.getByText('Open the DNS records for your domain')).not.toBeNull();
        expect(screen.getByRole('link', { name: 'Open Cloudflare DNS records' })).not.toBeNull();

        fireEvent.click(screen.getByRole('button', { name: '2. Add record' }));

        expect(screen.getByText('Add the record')).not.toBeNull();
        expect(screen.getByText('Choose one of the record alternatives shown above.')).not.toBeNull();
        expect(screen.getByText(/set Proxy status to DNS only/)).not.toBeNull();
        expect(screen.queryByText('203.0.113.42')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: '3. Check DNS' }));

        expect(screen.getByText('Check the result')).not.toBeNull();
        expect(screen.getByText('Remove conflicting A, AAAA, or CNAME records for the same hostname.')).not.toBeNull();
    });

    it('explains when every non-proxyable record must be added', () => {
        render(
            <CloudflareDnsWizard
                domain="agents.example.com"
                recordSelection="all"
                records={[
                    {
                        type: 'MX',
                        name: 'agents.example.com',
                        value: '10 mail.agents.example.com.',
                        note: null,
                    },
                    {
                        type: 'TXT',
                        name: 'agents.example.com',
                        value: 'v=spf1 mx -all',
                        note: null,
                    },
                ]}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: '2. Add record' }));

        expect(screen.getByText('Repeat this for all 2 records shown above.')).not.toBeNull();
        expect(screen.queryByText(/set Proxy status to DNS only/)).toBeNull();
    });
});
