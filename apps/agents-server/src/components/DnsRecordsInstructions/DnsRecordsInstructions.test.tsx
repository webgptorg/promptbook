/** @jest-environment jsdom */

import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { DnsRecordsInstructions } from './DnsRecordsInstructions';

describe('DnsRecordsInstructions', () => {
    it('shows every record as required when configuring the email domain', () => {
        render(
            <DnsRecordsInstructions
                domain="agents.example.com"
                recordSelection="all"
                records={[
                    {
                        type: 'MX',
                        name: 'agents.example.com',
                        value: '10 mail.agents.example.com.',
                        note: 'Routes inbound email to the mail server.',
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
});
