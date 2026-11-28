import { describe, expect, it } from '@jest/globals';
import { selectPrefixesForMigration } from './selectPrefixesForMigration';
import { SERVER_ENVIRONMENT, type ServerRecord } from '../utils/serverRegistry';

describe('selectPrefixesForMigration', () => {
    const registeredServers: Array<ServerRecord> = [
        createServerRecord({
            id: 1,
            name: 'production-eu-west',
            environment: SERVER_ENVIRONMENT.PRODUCTION,
            domain: 'prod-eu.ptbk.io',
            tablePrefix: 'server_ProductionEuWest_',
        }),
        createServerRecord({
            id: 2,
            name: 'preview-1',
            environment: SERVER_ENVIRONMENT.PREVIEW,
            domain: 'preview-1.ptbk.io',
            tablePrefix: 'server_Preview1_',
        }),
        createServerRecord({
            id: 3,
            name: 'preview-2',
            environment: SERVER_ENVIRONMENT.PREVIEW,
            domain: 'preview-2.ptbk.io',
            tablePrefix: 'server_Preview2_',
        }),
    ];

    const configuredPrefixes = ['', ...registeredServers.map((server) => server.tablePrefix)];

    it('returns only production prefixes for the production group', () => {
        expect(selectPrefixesForMigration(configuredPrefixes, registeredServers, ['production'])).toEqual([
            'server_ProductionEuWest_',
        ]);
    });

    it('returns only preview prefixes for the preview group', () => {
        expect(selectPrefixesForMigration(configuredPrefixes, registeredServers, ['preview'])).toEqual([
            'server_Preview1_',
            'server_Preview2_',
        ]);
    });

    it('allows targeting one server by registered name', () => {
        expect(selectPrefixesForMigration(configuredPrefixes, registeredServers, ['preview-2'])).toEqual([
            'server_Preview2_',
        ]);
    });

    it('still allows targeting one server by raw prefix', () => {
        expect(selectPrefixesForMigration(configuredPrefixes, registeredServers, ['server_Preview1_'])).toEqual([
            'server_Preview1_',
        ]);
    });

    it('throws when target is unknown', () => {
        expect(() => selectPrefixesForMigration(configuredPrefixes, registeredServers, ['unknown-server'])).toThrow(
            'Invalid migration targets specified in `--only`',
        );
    });
});

/**
 * Creates one normalized test server record.
 *
 * @param partialServer - Overridden record fields.
 * @returns Fully populated server record.
 */
function createServerRecord(partialServer: Partial<ServerRecord>): ServerRecord {
    return {
        id: partialServer.id ?? 1,
        name: partialServer.name ?? 'test-server',
        environment: partialServer.environment ?? SERVER_ENVIRONMENT.PREVIEW,
        domain: partialServer.domain ?? 'test.ptbk.io',
        tablePrefix: partialServer.tablePrefix ?? 'server_Test_',
        createdAt: partialServer.createdAt ?? '2026-03-11T00:00:00.000Z',
        updatedAt: partialServer.updatedAt ?? '2026-03-11T00:00:00.000Z',
    };
}
