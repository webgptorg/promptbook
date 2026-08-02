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
});
