import { describe, expect, it } from '@jest/globals';
import { resolveServerSelection } from './serverSelection';
import { SERVER_ENVIRONMENT, type ServerRecord } from './serverRegistry';

describe('resolveServerSelection', () => {
    it('returns the host-matched server when no override is active', () => {
        const alphaServer = createServerRecord({
            id: 1,
            name: 'alpha',
            domain: 'alpha.ptbk.io',
            tablePrefix: 'server_Alpha_',
        });
        const betaServer = createServerRecord({
            id: 2,
            name: 'beta',
            domain: 'beta.ptbk.io',
            tablePrefix: 'server_Beta_',
        });

        const selection = resolveServerSelection({
            host: 'beta.ptbk.io',
            registeredServers: [alphaServer, betaServer],
        });

        expect(selection).toEqual({
            hostServer: betaServer,
            currentServer: betaServer,
            isOverridden: false,
        });
    });

    it('applies the selected override when allowed for the global admin session', () => {
        const alphaServer = createServerRecord({
            id: 1,
            name: 'alpha',
            domain: 'alpha.ptbk.io',
            tablePrefix: 'server_Alpha_',
        });
        const betaServer = createServerRecord({
            id: 2,
            name: 'beta',
            domain: 'beta.ptbk.io',
            tablePrefix: 'server_Beta_',
        });

        const selection = resolveServerSelection({
            host: 'alpha.ptbk.io',
            registeredServers: [alphaServer, betaServer],
            activeServerId: betaServer.id,
            allowOverride: true,
        });

        expect(selection).toEqual({
            hostServer: alphaServer,
            currentServer: betaServer,
            isOverridden: true,
        });
    });

    it('ignores the override when the request is not allowed to use it', () => {
        const alphaServer = createServerRecord({
            id: 1,
            name: 'alpha',
            domain: 'alpha.ptbk.io',
            tablePrefix: 'server_Alpha_',
        });
        const betaServer = createServerRecord({
            id: 2,
            name: 'beta',
            domain: 'beta.ptbk.io',
            tablePrefix: 'server_Beta_',
        });

        const selection = resolveServerSelection({
            host: 'alpha.ptbk.io',
            registeredServers: [alphaServer, betaServer],
            activeServerId: betaServer.id,
            allowOverride: false,
        });

        expect(selection).toEqual({
            hostServer: alphaServer,
            currentServer: alphaServer,
            isOverridden: false,
        });
    });

    it('can resolve a server from the forwarded host header', () => {
        const forwardedServer = createServerRecord({
            id: 7,
            name: 'forwarded',
            domain: 'forwarded.ptbk.io',
            tablePrefix: 'server_Forwarded_',
        });

        const selection = resolveServerSelection({
            host: 'localhost:4440',
            forwardedServerHost: 'forwarded.ptbk.io',
            registeredServers: [forwardedServer],
        });

        expect(selection).toEqual({
            hostServer: forwardedServer,
            currentServer: forwardedServer,
            isOverridden: false,
        });
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
        createdAt: partialServer.createdAt ?? '2026-03-12T00:00:00.000Z',
        updatedAt: partialServer.updatedAt ?? '2026-03-12T00:00:00.000Z',
    };
}
