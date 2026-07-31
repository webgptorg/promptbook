/** @jest-environment jsdom */

import { describe, expect, it } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import { CloudflareDnsWizard } from './CloudflareDnsWizard';

describe('CloudflareDnsWizard', () => {
    it('offers a one-click import of the recommended record and explains the skipped alternative', () => {
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
                    {
                        type: 'CNAME',
                        name: 'agents.example.com',
                        value: 'live.example.com',
                        note: null,
                    },
                ]}
            />,
        );

        expect(screen.getByText('Import all records with one click')).not.toBeNull();
        expect(screen.getByRole('button', { name: 'Import 1 record' })).not.toBeNull();
        expect(screen.getByText('Not part of this import')).not.toBeNull();
        expect(
            screen.getByText(
                'Alternative of the recommended record, configure it only instead of the recommended record.',
                { exact: false },
            ),
        ).not.toBeNull();
    });

    it('exports every required record as one importable zone file', () => {
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

        expect(screen.getByRole('button', { name: 'Import 2 records' })).not.toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Import zone file' }));

        expect(screen.getByRole('button', { name: 'Download zone file' })).not.toBeNull();

        const zoneFile = screen.getByText(/Import this file at your DNS provider/).textContent || '';

        expect(zoneFile).toContain('agents.example.com.\t1\tIN\tMX\t10 mail.agents.example.com.');
        expect(zoneFile).toContain('agents.example.com.\t1\tIN\tTXT\t"v=spf1 mx -all"');
    });

    it('keeps the manual steps for administrators who do not want to import at once', () => {
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

        fireEvent.click(screen.getByRole('button', { name: 'Add manually' }));

        expect(screen.getByText('Add the records one by one')).not.toBeNull();
        expect(screen.getByText('Choose one of the record alternatives shown above.')).not.toBeNull();
        expect(screen.getByText(/set Proxy status to DNS only/)).not.toBeNull();
        expect(screen.getByRole('link', { name: 'Open Cloudflare DNS records' })).not.toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Check DNS' }));

        expect(screen.getByText('Check the result')).not.toBeNull();
        expect(screen.getByText('Remove conflicting A, AAAA, or CNAME records for the same hostname.')).not.toBeNull();
    });

    it('shows only the manual steps when no record can be imported automatically', () => {
        render(
            <CloudflareDnsWizard
                domain="agents.example.com"
                recordSelection="all"
                records={[
                    {
                        type: 'A',
                        name: 'mail.agents.example.com',
                        value: '<VPS_PUBLIC_IP>',
                        note: null,
                    },
                ]}
            />,
        );

        expect(screen.queryByRole('button', { name: 'Import with API token' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Import zone file' })).toBeNull();
        expect(screen.getByText('Add the records one by one')).not.toBeNull();
    });
});
