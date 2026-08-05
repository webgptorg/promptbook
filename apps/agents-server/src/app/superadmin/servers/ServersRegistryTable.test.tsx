/** @jest-environment jsdom */

import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { ServersRegistryTable } from './ServersRegistryTable';
import type { ManagedServerRow } from './useServersRegistryState';

/**
 * Standalone server without any assigned project domains yet.
 */
const SERVER_WITHOUT_PROJECT_DOMAINS: ManagedServerRow = {
    id: 1,
    name: 'Live',
    environment: 'LIVE',
    domain: 'live.ptbk.io',
    tablePrefix: 'live_',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    projectDomains: [],
};

/**
 * Standalone server whose own domain already resolves to the VPS.
 */
const SERVER_WITH_VERIFIED_DNS: ManagedServerRow = {
    ...SERVER_WITHOUT_PROJECT_DOMAINS,
    dnsDiagnostic: {
        status: 'verified',
        summary: 'DNS is ready. `live.ptbk.io` resolves to this VPS.',
        publicIpAddress: '203.0.113.42',
        resolvedAddresses: ['203.0.113.42'],
        expectedRecords: [
            {
                type: 'A',
                name: 'live.ptbk.io',
                value: '203.0.113.42',
                note: 'Recommended. Point this hostname directly to the VPS public IP address.',
            },
        ],
        providerGuides: [],
    },
};

describe('ServersRegistryTable', () => {
    it('shows preventive wildcard project DNS guidance before the first project domain is assigned', () => {
        render(
            <ServersRegistryTable
                canEdit={false}
                currentServerId={null}
                isServerDraftDirty={() => false}
                isStandaloneVps={true}
                loading={false}
                migratingServerId={null}
                navigatingServerId={null}
                onMigrateServer={jest.fn(async () => undefined)}
                onSaveServer={jest.fn(async () => undefined)}
                onSwitchServer={jest.fn(async () => undefined)}
                onUpdateServerDraft={jest.fn()}
                savingServerId={null}
                serverDrafts={{}}
                servers={[SERVER_WITHOUT_PROJECT_DOMAINS]}
            />,
        );

        expect(
            screen.getByText(
                'No project domains are assigned yet. Configure the wildcard record below before the first project is published.',
            ),
        ).not.toBeNull();
        expect(screen.getByText('*.live.ptbk.io')).not.toBeNull();
        expect(screen.getAllByText('live.ptbk.io')).not.toHaveLength(0);
    });

    it('unites the project and email DNS records of one server in one manual with one Cloudflare wizard', () => {
        render(
            <ServersRegistryTable
                canEdit={false}
                currentServerId={null}
                isServerDraftDirty={() => false}
                isStandaloneVps={true}
                loading={false}
                migratingServerId={null}
                navigatingServerId={null}
                onMigrateServer={jest.fn(async () => undefined)}
                onSaveServer={jest.fn(async () => undefined)}
                onSwitchServer={jest.fn(async () => undefined)}
                onUpdateServerDraft={jest.fn()}
                savingServerId={null}
                serverDrafts={{}}
                servers={[SERVER_WITH_VERIFIED_DNS]}
            />,
        );

        expect(screen.getByText('Server domain live.ptbk.io')).not.toBeNull();
        expect(screen.getByText('Project domains under live.ptbk.io')).not.toBeNull();
        expect(screen.getByText('Email for live.ptbk.io')).not.toBeNull();
        expect(screen.getByText('*.live.ptbk.io')).not.toBeNull();
        expect(screen.getByText('mail.live.ptbk.io')).not.toBeNull();
        expect(screen.getByText('_dmarc.live.ptbk.io')).not.toBeNull();
        expect(screen.getAllByLabelText('Cloudflare DNS setup')).toHaveLength(1);
    });
});
