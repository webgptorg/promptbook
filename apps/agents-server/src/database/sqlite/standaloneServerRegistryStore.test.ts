import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const ORIGINAL_ENVIRONMENT = { ...process.env };

describe('standaloneServerRegistryStore', () => {
    let temporaryDirectory: string;

    beforeEach(() => {
        jest.resetModules();
        temporaryDirectory = mkdtempSync(join(tmpdir(), 'promptbook-server-registry-'));
        process.env = {
            ...ORIGINAL_ENVIRONMENT,
            PTBK_AGENTS_SERVER_SQLITE_PATH: join(temporaryDirectory, 'agents-server.sqlite'),
        };
        delete process.env.SERVERS;
        delete process.env.SUPABASE_TABLE_PREFIX;
    });

    afterEach(async () => {
        const { $resetLocalSqliteSupabaseForTests } = await import('./$provideLocalSqliteSupabase');

        $resetLocalSqliteSupabaseForTests();
        process.env = { ...ORIGINAL_ENVIRONMENT };
        rmSync(temporaryDirectory, { recursive: true, force: true });
    });

    it('bootstraps the registry from the SERVERS environment variable on a fresh install', async () => {
        process.env.SERVERS = 'client-a.example.com, client-b.example.com';

        const { listStandaloneRegisteredServers } = await import('./standaloneServerRegistryStore');
        const servers = listStandaloneRegisteredServers();

        expect(servers.map((server) => server.domain)).toEqual(['client-a.example.com', 'client-b.example.com']);
        expect(servers.map((server) => server.tablePrefix)).toEqual([
            'server_client_dash_a_example_com_',
            'server_client_dash_b_example_com_',
        ]);
        expect(new Set(servers.map((server) => server.id)).size).toBe(2);
    });

    it('gives every domain its own namespace even when SUPABASE_TABLE_PREFIX is configured', async () => {
        // Note: This is the regression guard for servers leaking agents/projects/metadata
        //       into each other through one shared configured table prefix.
        process.env.SERVERS = 'client-a.example.com, client-b.example.com';
        process.env.SUPABASE_TABLE_PREFIX = 'server_client_a_example_com_';

        const { listStandaloneRegisteredServers } = await import('./standaloneServerRegistryStore');
        const tablePrefixes = listStandaloneRegisteredServers().map((server) => server.tablePrefix);

        expect(new Set(tablePrefixes).size).toBe(2);
    });

    it('registers SERVERS domains through the routing hot path so installer CLI seeding is isolated too', async () => {
        // Note: The installer seeds default agents in a standalone CLI process before the
        //       web server ever boots — routing itself must bootstrap the registry.
        process.env.SERVERS = 'client-a.example.com';

        const { resolveLocalSqliteTableLocation } = await import('./resolveLocalSqliteTableLocation');
        const location = resolveLocalSqliteTableLocation('server_client_dash_a_example_com_Agent');

        expect(location.localTableName).toBe('Agent');
    });

    it('rejects duplicate domains and namespaces', async () => {
        const { createStandaloneServer } = await import('./standaloneServerRegistryStore');
        createStandaloneServer({
            name: 'Client A',
            environment: 'PRODUCTION',
            domain: 'client-a.example.com',
            tablePrefix: 'server_ClientA_',
        });

        expect(() =>
            createStandaloneServer({
                name: 'Client A copy',
                environment: 'PRODUCTION',
                domain: 'client-a.example.com',
                tablePrefix: 'server_ClientACopy_',
            }),
        ).toThrow(/already used/);

        expect(() =>
            createStandaloneServer({
                name: 'Client A prefix clash',
                environment: 'PRODUCTION',
                domain: 'clash.example.com',
                tablePrefix: 'server_clienta_',
            }),
        ).toThrow(/already used/);
    });

    it('keeps the server id and isolated database when the domain changes', async () => {
        const { createStandaloneServer, updateStandaloneServer, getStandaloneServerById } = await import(
            './standaloneServerRegistryStore'
        );
        const createdServer = createStandaloneServer({
            name: 'Client A',
            environment: 'PRODUCTION',
            domain: 'client-a.example.com',
            tablePrefix: 'server_ClientA_',
        });

        const updatedServer = updateStandaloneServer(createdServer.id, { domain: 'client-a.example.org' });

        expect(updatedServer.id).toBe(createdServer.id);
        expect(updatedServer.tablePrefix).toBe('server_ClientA_');
        expect(updatedServer.domain).toBe('client-a.example.org');
        expect(getStandaloneServerById(createdServer.id)?.domain).toBe('client-a.example.org');
    });

    it('removes deleted servers from the registry', async () => {
        const { createStandaloneServer, deleteStandaloneServer, listStandaloneRegisteredServers } = await import(
            './standaloneServerRegistryStore'
        );
        const createdServer = createStandaloneServer({
            name: 'Client A',
            environment: 'PRODUCTION',
            domain: 'client-a.example.com',
            tablePrefix: 'server_ClientA_',
        });

        deleteStandaloneServer(createdServer.id);

        expect(listStandaloneRegisteredServers()).toEqual([]);
    });
});
