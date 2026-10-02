import { createServer } from 'net';
import { mkdir, readFile, readdir, rm, symlink, writeFile } from 'fs/promises';
import { join } from 'path';
import type { number_port } from '../../../src/types/number_positive';
import { $closeAgentsServerSqliteDatabases } from '../../../apps/agents-server/src/database/sqlite/$provideAgentsServerSqliteDatabase';
import { startAgentsServerWeb } from '../../../src/cli/cli-commands/agents-server/startAgentsServer/startAgentsServerWeb';
import { AgentCollectionInWorkspace } from './AgentCollectionInWorkspace';
import { applyWorkspaceTerminalKey } from './WorkspaceTerminal';
import { startWorkspaceServer } from './startWorkspaceServer';
import {
    createWorkspaceServerEnvironment,
    resolveWorkspaceStoragePaths,
    WORKSPACE_SERVER_SECRETS_PATH,
} from './workspaceServerEnvironment';
import { createWorkspaceFixture } from './testing/workspaceFixture';
import { WorkspaceState } from './WorkspaceState';
import { initializeCoderProjectConfiguration } from '../../../src/cli/cli-commands/coder/initializeCoderProjectConfiguration';

jest.mock('../../../src/cli/cli-commands/agents-server/startAgentsServer/startAgentsServerWeb', () => ({
    startAgentsServerWeb: jest.fn(),
}));

describe('workspace startup and persistence', () => {
    let savedSqlitePath: string | undefined;
    let fixture: Awaited<ReturnType<typeof createWorkspaceFixture>>;
    beforeEach(async () => {
        fixture = await createWorkspaceFixture();
        savedSqlitePath = process.env.PTBK_AGENTS_SERVER_SQLITE_PATH;
        delete process.env.PTBK_AGENTS_SERVER_SQLITE_PATH;
        jest.spyOn(console, 'info').mockImplementation(() => undefined);
    });
    afterEach(async () => {
        await fixture.dispose();
        if (savedSqlitePath === undefined) delete process.env.PTBK_AGENTS_SERVER_SQLITE_PATH;
        else process.env.PTBK_AGENTS_SERVER_SQLITE_PATH = savedSqlitePath;
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    it('previews without creating bootstrap, services, secrets, locks or SQLite state', async () => {
        $closeAgentsServerSqliteDatabases([fixture.databasePath]);
        await rm(join(fixture.root, '.promptbook'), { recursive: true });
        const before = await readdir(fixture.root);
        await startWorkspaceServer({
            ...fixture.options,
            dryRun: true,
            port: 4441 as number_port,
            isBuildForced: false,
            isPaused: false,
        });
        expect(await readdir(fixture.root)).toEqual(before);
        expect(startAgentsServerWeb).not.toHaveBeenCalled();
    });

    it('rejects occupied ports before bootstrap or opening new operational state', async () => {
        const listener = createServer();
        await new Promise<void>((done) => listener.listen(0, '127.0.0.1', done));
        const port = (listener.address() as { port: number }).port as number_port;
        try {
            await expect(
                startWorkspaceServer({ ...fixture.options, port, isBuildForced: false, isPaused: false }),
            ).rejects.toThrow('Cannot listen');
            await expect(readFile(join(fixture.root, WORKSPACE_SERVER_SECRETS_PATH))).rejects.toMatchObject({
                code: 'ENOENT',
            });
            expect(startAgentsServerWeb).not.toHaveBeenCalled();
        } finally {
            await new Promise<void>((done) => listener.close(() => done()));
        }
    });

    it('rejects a bootstrap symlink before writing through it in both shared initialization and server startup', async () => {
        const external = fixture.root + '-external';
        await mkdir(external);
        await rm(join(fixture.root, 'prompts'), { recursive: true });
        await symlink(external, join(fixture.root, 'prompts'), 'junction');
        try {
            await expect(initializeCoderProjectConfiguration(fixture.root)).rejects.toThrow('Symlinks');
            await expect(
                startWorkspaceServer({
                    ...fixture.options,
                    port: 4441 as number_port,
                    isBuildForced: false,
                    isPaused: false,
                }),
            ).rejects.toThrow('Symlinks');
            expect(await readdir(external)).toEqual([]);
            expect(startAgentsServerWeb).not.toHaveBeenCalled();
            await expect(readFile(join(fixture.root, '.env'))).rejects.toMatchObject({ code: 'ENOENT' });
        } finally {
            await rm(external, { recursive: true, force: true });
        }
    });

    it('reopens users, metadata, chats and jobs at the same project paths and isolates another project', async () => {
        const other = await createWorkspaceFixture();
        try {
            await fixture.client
                .from('User')
                .insert({ username: 'alice', passwordHash: 'fixture-only', isAdmin: false });
            await fixture.client.from('Metadata').insert({ key: 'SITE_NAME', value: 'Persistent fixture' });
            await fixture.client.from('UserChat').insert({
                id: 'fixture-chat',
                userId: 1,
                agentPermanentId: (await fixture.collection.listWorkspaceAgents())[0]!.id,
                title: 'History',
            });
            fixture.state.discoverJob({
                id: 'job',
                path: 'prompts/persist.md',
                section: 0,
                priority: 2,
                status: 'blocked',
                updatedAt: new Date().toISOString(),
                reason: 'Harness missing',
            });
            const identity = (await fixture.collection.listWorkspaceAgents())[0]!.id;
            $closeAgentsServerSqliteDatabases([fixture.databasePath]);
            const reopened = new AgentCollectionInWorkspace(
                fixture.workspace,
                fixture.client,
                new WorkspaceState(fixture.databasePath),
            );
            expect((await reopened.listWorkspaceAgents())[0]!.id).toBe(identity);
            expect((await fixture.client.from('User').select('username')).data).toEqual([
                expect.objectContaining({ username: 'alice' }),
            ]);
            expect((await fixture.client.from('Metadata').select('value').eq('key', 'SITE_NAME')).data).toEqual([
                expect.objectContaining({ value: 'Persistent fixture' }),
            ]);
            expect((await fixture.client.from('UserChat').select('id')).data).toEqual([
                expect.objectContaining({ id: 'fixture-chat' }),
            ]);
            expect(reopened.state.listJobs()[0]).toMatchObject({ id: 'job', status: 'blocked' });
            expect((await other.client.from('User').select('username')).data).toEqual([]);
            expect(other.state.listJobs()).toEqual([]);
            const paths = resolveWorkspaceStoragePaths(fixture.root, {});
            expect(paths.databasePath).toBe(fixture.databasePath);
            expect(resolveWorkspaceStoragePaths(fixture.root, { PORT: '4999' }).databasePath).toBe(paths.databasePath);
            expect(() =>
                resolveWorkspaceStoragePaths(fixture.root, { PTBK_AGENTS_SERVER_SQLITE_PATH: '/tmp/unrelated.sqlite' }),
            ).toThrow('beneath');
        } finally {
            await other.dispose();
        }
    });

    it('persists private random credentials, respects configured credentials and shares pause/stop controls', async () => {
        const environment = await createWorkspaceServerEnvironment(fixture.root, {});
        const repeated = await createWorkspaceServerEnvironment(fixture.root, {});
        expect(repeated.ADMIN_PASSWORD).toBe(environment.ADMIN_PASSWORD);
        expect(environment.ADMIN_PASSWORD).toHaveLength(64);
        expect(
            (
                await createWorkspaceServerEnvironment(fixture.root, {
                    ADMIN_PASSWORD: 'explicit-admin',
                    SESSION_SECRET: 'explicit-secret',
                })
            ).ADMIN_PASSWORD,
        ).toBe('explicit-admin');
        applyWorkspaceTerminalKey(fixture.state, 'p');
        expect(fixture.state.getControl().isPaused).toBe(true);
        applyWorkspaceTerminalKey(fixture.state, 'p');
        expect(fixture.state.getControl().isPaused).toBe(false);
        applyWorkspaceTerminalKey(fixture.state, 'x');
        expect(fixture.state.getControl().isStopping).toBe(true);
        await mkdir(join(fixture.root, '.promptbook/logs'), { recursive: true });
        await writeFile(join(fixture.root, '.promptbook/logs/runtime.log'), 'Private log');
    });
});
