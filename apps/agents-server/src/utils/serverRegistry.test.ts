import { listEnvironmentRegisteredServers } from './serverRegistry';

const ORIGINAL_SERVERS = process.env.SERVERS;
const ORIGINAL_SUPABASE_TABLE_PREFIX = process.env.SUPABASE_TABLE_PREFIX;

describe('listEnvironmentRegisteredServers', () => {
    afterEach(() => {
        restoreEnvironmentVariable('SERVERS', ORIGINAL_SERVERS);
        restoreEnvironmentVariable('SUPABASE_TABLE_PREFIX', ORIGINAL_SUPABASE_TABLE_PREFIX);
    });

    it('creates deterministic production server records from SERVERS', () => {
        delete process.env.SUPABASE_TABLE_PREFIX;
        setEnvironmentVariable('SERVERS', 'https://www.example.com, support.example-site.com, www.example.com');

        expect(listEnvironmentRegisteredServers()).toEqual([
            {
                id: -1,
                name: 'www.example.com',
                environment: 'PRODUCTION',
                domain: 'www.example.com',
                tablePrefix: 'server_www_example_com_',
                createdAt: '1970-01-01T00:00:00.000Z',
                updatedAt: '1970-01-01T00:00:00.000Z',
            },
            {
                id: -2,
                name: 'support.example-site.com',
                environment: 'PRODUCTION',
                domain: 'support.example-site.com',
                tablePrefix: 'server_support_example_dash_site_com_',
                createdAt: '1970-01-01T00:00:00.000Z',
                updatedAt: '1970-01-01T00:00:00.000Z',
            },
        ]);
    });

    it('uses the configured standalone VPS table prefix for all SERVERS domains', () => {
        setEnvironmentVariable('SERVERS', 'www.example.com, support.example.com');
        setEnvironmentVariable('SUPABASE_TABLE_PREFIX', 'server_AcmeSupport_');

        expect(listEnvironmentRegisteredServers().map((server) => server.tablePrefix)).toEqual([
            'server_AcmeSupport_',
            'server_AcmeSupport_',
        ]);
    });

    it('ignores invalid and empty SERVERS entries', () => {
        delete process.env.SUPABASE_TABLE_PREFIX;
        setEnvironmentVariable('SERVERS', 'example.com, not a domain, , https://valid.example.com/path');

        expect(listEnvironmentRegisteredServers().map((server) => server.domain)).toEqual([
            'example.com',
            'valid.example.com',
        ]);
    });
});

/**
 * Restores one environment variable after test mutation.
 *
 * @param envName - Environment variable name.
 * @param value - Original value before the test changed it.
 */
function restoreEnvironmentVariable(envName: 'SERVERS' | 'SUPABASE_TABLE_PREFIX', value: string | undefined): void {
    if (value === undefined) {
        delete process.env[envName];
        return;
    }

    setEnvironmentVariable(envName, value);
}

/**
 * Sets one environment variable in a way that works with readonly Node.js typings.
 *
 * @param envName - Environment variable name.
 * @param value - Value to assign for the current test.
 */
function setEnvironmentVariable(envName: 'SERVERS' | 'SUPABASE_TABLE_PREFIX', value: string): void {
    Reflect.set(process.env, envName, value);
}
