import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const ORIGINAL_ENVIRONMENT = { ...process.env };

describe('standalone VPS server metadata', () => {
    let temporaryDirectory: string;

    beforeEach(() => {
        jest.resetModules();
        temporaryDirectory = mkdtempSync(join(tmpdir(), 'promptbook-server-metadata-'));
        process.env = {
            ...ORIGINAL_ENVIRONMENT,
            PTBK_AGENTS_SERVER_DATABASE: 'sqlite',
            PTBK_AGENTS_SERVER_SQLITE_PATH: join(temporaryDirectory, 'agents-server.sqlite'),
        };
        delete process.env.SERVERS;
        delete process.env.SUPABASE_TABLE_PREFIX;
    });

    afterEach(async () => {
        const { $resetLocalSqliteSupabaseForTests } = await import('../../database/sqlite/$provideLocalSqliteSupabase');

        $resetLocalSqliteSupabaseForTests();
        process.env = { ...ORIGINAL_ENVIRONMENT };
        rmSync(temporaryDirectory, { recursive: true, force: true });
    });

    it('updates the metadata of the selected server without changing another server on the VPS', async () => {
        const { createStandaloneServer } = await import('../../database/sqlite/standaloneServerRegistryStore');
        const { applyServerMetadata, resolveStandaloneVpsServerDisplayName } = await import(
            './standaloneVpsServerMetadata'
        );
        const firstServer = createStandaloneServer({
            name: 'First registry name',
            environment: 'PRODUCTION',
            domain: 'first.example.com',
            tablePrefix: 'server_First_',
        });
        const secondServer = createStandaloneServer({
            name: 'Second registry name',
            environment: 'PRODUCTION',
            domain: 'second.example.com',
            tablePrefix: 'server_Second_',
        });

        const { runWithServerContextOverride } = await import('../../tools/serverContextOverride');
        await applyServerMetadata({ server: firstServer, name: 'First server' });
        await applyServerMetadata({ server: secondServer, name: 'Second server' });

        const { $provideLocalSqliteSupabase } = await import('../../database/sqlite/$provideLocalSqliteSupabase');
        const supabase = $provideLocalSqliteSupabase();
        await supabase
            .from(`${secondServer.tablePrefix}Metadata`)
            .update({ note: 'Keep this custom note.' })
            .eq('key', 'SERVER_NAME');
        await runWithServerContextOverride(
            {
                id: firstServer.id,
                publicUrl: new URL('https://first.example.com'),
                tablePrefix: firstServer.tablePrefix,
            },
            () => applyServerMetadata({ server: secondServer, name: 'Renamed second server' }),
        );

        const { data: firstServerMetadata } = await supabase
            .from(`${firstServer.tablePrefix}Metadata`)
            .select('value,note')
            .eq('key', 'SERVER_NAME')
            .single();
        const { data: secondServerMetadata } = await supabase
            .from(`${secondServer.tablePrefix}Metadata`)
            .select('value,note')
            .eq('key', 'SERVER_NAME')
            .single();

        expect(firstServerMetadata).toEqual({ value: 'First server', note: null });
        expect(secondServerMetadata).toEqual({
            value: 'Renamed second server',
            note: 'Keep this custom note.',
        });
        await expect(resolveStandaloneVpsServerDisplayName(firstServer)).resolves.toBe('First server');
        await expect(resolveStandaloneVpsServerDisplayName(secondServer)).resolves.toBe('Renamed second server');
    });
});
