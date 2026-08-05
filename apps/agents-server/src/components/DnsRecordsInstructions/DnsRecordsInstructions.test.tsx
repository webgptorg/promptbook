/** @jest-environment jsdom */

import { describe, expect, it } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import { createServerDnsRecordsSections } from '../../utils/dnsRecords/createServerDnsRecordsSections';
import { DnsRecordsInstructions } from './DnsRecordsInstructions';

describe('DnsRecordsInstructions', () => {
    it('shows every record as required when configuring the email domain', () => {
        render(
            <DnsRecordsInstructions
                domain="agents.example.com"
                sections={[
                    {
                        id: 'email',
                        title: 'Email for agents.example.com',
                        variants: [
                            {
                                id: 'email',
                                label: 'Email',
                                recordSelection: 'all',
                                records: [
                                    {
                                        type: 'MX',
                                        name: 'agents.example.com',
                                        value: '10 mail.agents.example.com.',
                                        note: 'Routes inbound email to the mail server.',
                                    },
                                ],
                            },
                        ],
                    },
                ]}
            />,
        );

        expect(screen.getByText('MX')).not.toBeNull();
        expect(screen.getByText('10 mail.agents.example.com.')).not.toBeNull();
        expect(
            screen.getByText(
                (_content, element) =>
                    element?.tagName === 'LI' &&
                    element.textContent === 'Add all records shown above for agents.example.com.',
            ),
        ).not.toBeNull();
        expect(screen.getByText('Provider guides')).not.toBeNull();
        expect(screen.queryByText('Remove conflicting A, AAAA, or CNAME records for the same hostname.')).toBeNull();
    });

    it('shows records as alternatives when configuring a server domain', () => {
        render(
            <DnsRecordsInstructions
                domain="agents.example.com"
                sections={[
                    {
                        id: 'server-domain',
                        title: 'Server domain agents.example.com',
                        variants: [
                            {
                                id: 'server-domain',
                                label: 'Server domain',
                                recordSelection: 'one',
                                records: [
                                    {
                                        type: 'A',
                                        name: 'agents.example.com',
                                        value: '203.0.113.42',
                                        note: null,
                                    },
                                ],
                            },
                        ],
                    },
                ]}
            />,
        );

        expect(
            screen.getByText(
                (_content, element) =>
                    element?.tagName === 'LI' &&
                    element.textContent === 'Add one of the records above for agents.example.com.',
            ),
        ).not.toBeNull();
        expect(screen.getByText('Required.')).not.toBeNull();
        expect(screen.getByText('Remove conflicting A, AAAA, or CNAME records for the same hostname.')).not.toBeNull();
    });

    it('configures the server domain, the project domains, and the email of one server from one wizard', () => {
        render(
            <DnsRecordsInstructions
                domain="agents.example.com"
                sections={createServerDnsRecordsSections({
                    serverDomain: 'agents.example.com',
                    dnsDiagnostic: {
                        status: 'pending',
                        summary: '`agents.example.com` does not resolve yet.',
                        publicIpAddress: '203.0.113.42',
                        resolvedAddresses: [],
                        expectedRecords: [
                            {
                                type: 'A',
                                name: 'agents.example.com',
                                value: '203.0.113.42',
                                note: 'Recommended. Point this hostname directly to the VPS public IP address.',
                            },
                        ],
                        providerGuides: [],
                    },
                })}
            />,
        );

        expect(screen.getByText('Server domain agents.example.com')).not.toBeNull();
        expect(screen.getByText('Project domains under agents.example.com')).not.toBeNull();
        expect(screen.getByText('Email for agents.example.com')).not.toBeNull();
        expect(screen.getByText('*.agents.example.com')).not.toBeNull();
        expect(screen.getByText('mail.agents.example.com')).not.toBeNull();
        expect(screen.getAllByLabelText('Cloudflare DNS setup')).toHaveLength(1);

        // Note: The server domain and the project domains are alternatives, the email records are all required.
        expect(
            screen.getByText(
                (_content, element) =>
                    element?.tagName === 'LI' &&
                    element.textContent ===
                        'Add all records shown above, and only one record from each group of alternatives for agents.example.com.',
            ),
        ).not.toBeNull();

        // Note: One record of the server domain, one wildcard project record, and all 8 email records.
        expect(screen.getByRole('button', { name: 'Import 10 records' })).not.toBeNull();
    });

    it('lets the administrator switch the generated project domains to a single-project A record', () => {
        render(
            <DnsRecordsInstructions
                domain="agents.example.com"
                sections={createServerDnsRecordsSections({
                    serverDomain: 'agents.example.com',
                    dnsDiagnostic: null,
                    projectDomain: 'shop.agents.example.com',
                })}
            />,
        );

        expect(screen.getByText('*.agents.example.com')).not.toBeNull();

        fireEvent.click(screen.getByRole('tab', { name: 'Single project A record' }));

        expect(screen.queryByText('*.agents.example.com')).toBeNull();
        expect(screen.getByText('shop.agents.example.com')).not.toBeNull();
        expect(
            screen.getByText(
                'This covers one project, for example shop.agents.example.com. Repeat it for each project that needs a public URL.',
            ),
        ).not.toBeNull();
    });
});
