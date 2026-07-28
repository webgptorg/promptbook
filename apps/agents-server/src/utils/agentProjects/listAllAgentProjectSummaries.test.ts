import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { PTBK_AGENTS_SERVER_AGENT_ROOT_ENV } from '../localChatRunner/localChatRunnerConstants';
import { createLocalAgentDirectoryName } from '../localChatRunner/ensureLocalAgentFolder';
import { getServerContextOverride } from '@/src/tools/serverContextOverride';
import { listRegisteredServersUsingServiceRole } from '../serverRegistry';
import { listAllAgentProjectSummaries } from './listAllAgentProjectSummaries';

jest.mock('@/src/database/$getTableName', () => ({
    $getTableName: jest.fn(async (tableName: string) => tableName),
}));

jest.mock('@/src/database/$provideSupabaseForServer', () => ({
    $provideSupabaseForServer: jest.fn(),
}));

jest.mock('../serverRegistry', () => ({
    createServerPublicUrl: jest.fn((domain: string) => new URL(`https://${domain}`)),
    listRegisteredServersUsingServiceRole: jest.fn(),
}));

/**
 * Original local agent root environment value restored after filesystem tests.
 */
const ORIGINAL_AGENT_ROOT = process.env[PTBK_AGENTS_SERVER_AGENT_ROOT_ENV];

/**
 * Mocked database rows returned from the current server `Agent` table.
 */
let mockedAgentRows: Array<{ permanentId: string | null; agentName: string | null }> = [];
let mockedAgentRowsByTablePrefix: Record<string, Array<{ permanentId: string | null; agentName: string | null }>> = {};

describe('listAllAgentProjectSummaries', () => {
    let temporaryDirectory: string | null = null;

    beforeEach(async () => {
        temporaryDirectory = await mkdtemp(join(tmpdir(), 'promptbook-agent-project-summaries-'));
        process.env[PTBK_AGENTS_SERVER_AGENT_ROOT_ENV] = temporaryDirectory;
        mockedAgentRows = [];
        mockedAgentRowsByTablePrefix = {};

        ($provideSupabaseForServer as jest.Mock).mockReturnValue(createMockSupabaseClient());
        (listRegisteredServersUsingServiceRole as jest.Mock).mockResolvedValue([]);
    });

    afterEach(async () => {
        if (temporaryDirectory) {
            await rm(temporaryDirectory, { recursive: true, force: true });
            temporaryDirectory = null;
        }

        restoreEnvironmentVariable(PTBK_AGENTS_SERVER_AGENT_ROOT_ENV, ORIGINAL_AGENT_ROOT);
        jest.clearAllMocks();
    });

    it('lists projects only for agents from the current server database', async () => {
        mockedAgentRows = [
            { permanentId: 'CurrentAgent', agentName: 'Current agent' },
            { permanentId: 'CurrentAgentWithoutProjects', agentName: 'Current empty agent' },
        ];

        await createProjectFile({
            agentPermanentId: 'CurrentAgent',
            projectName: 'current-project',
            fileName: 'index.html',
        });
        await createProjectFile({
            agentPermanentId: 'OtherServerAgent',
            projectName: 'leaked-project',
            fileName: 'index.html',
        });

        const report = await listAllAgentProjectSummaries();

        expect(report.totalAgentCount).toBe(2);
        expect(report.summaries).toHaveLength(1);
        expect(report.summaries[0]).toMatchObject({
            agentPermanentId: 'CurrentAgent',
            agentName: 'Current agent',
            agentDirectoryName: createLocalAgentDirectoryName('CurrentAgent'),
        });
        expect(report.summaries[0]?.projects.map((project) => project.projectName)).toEqual(['current-project']);
        expect(report.totalProjectCount).toBe(1);
    });

    it('aggregates projects from every registered server for the VPS scope', async () => {
        const firstServer = {
            id: 1,
            name: 'First server',
            environment: 'PRODUCTION' as const,
            domain: 'first.example.com',
            tablePrefix: 'server_First_',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
        };
        const secondServer = {
            id: 2,
            name: 'Second server',
            environment: 'PRODUCTION' as const,
            domain: 'second.example.com',
            tablePrefix: 'server_Second_',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
        };
        (listRegisteredServersUsingServiceRole as jest.Mock).mockResolvedValue([firstServer, secondServer]);
        mockedAgentRowsByTablePrefix = {
            [firstServer.tablePrefix]: [{ permanentId: 'FirstAgent', agentName: 'First agent' }],
            [secondServer.tablePrefix]: [{ permanentId: 'SecondAgent', agentName: 'Second agent' }],
        };

        await createProjectFile({
            agentPermanentId: 'FirstAgent',
            projectName: 'first-project',
            fileName: 'index.html',
        });
        await createProjectFile({
            agentPermanentId: 'SecondAgent',
            projectName: 'second-project',
            fileName: 'index.html',
        });

        const report = await listAllAgentProjectSummaries({ scope: 'vps' });

        expect(report.totalAgentCount).toBe(2);
        expect(report.totalProjectCount).toBe(2);
        expect(report.summaries).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    agentPermanentId: 'FirstAgent',
                    serverDomain: firstServer.domain,
                }),
                expect.objectContaining({
                    agentPermanentId: 'SecondAgent',
                    serverDomain: secondServer.domain,
                }),
            ]),
        );
    });
});

/**
 * Creates one project file below the temporary local agent root.
 */
async function createProjectFile(options: {
    readonly agentPermanentId: string;
    readonly projectName: string;
    readonly fileName: string;
}): Promise<void> {
    const projectPath = join(
        process.env[PTBK_AGENTS_SERVER_AGENT_ROOT_ENV]!,
        createLocalAgentDirectoryName(options.agentPermanentId),
        'projects',
        options.projectName,
    );

    await mkdir(projectPath, { recursive: true });
    await writeFile(join(projectPath, options.fileName), '<!doctype html>', 'utf-8');
}

/**
 * Creates the Supabase-shaped mock chain used by the summary loader.
 */
function createMockSupabaseClient() {
    return {
        from: jest.fn(() => ({
            select: jest.fn(() => ({
                is: jest.fn(async () => ({
                    data: mockedAgentRowsByTablePrefix[getServerContextOverride()?.tablePrefix || ''] || mockedAgentRows,
                    error: null,
                })),
            })),
        })),
    };
}

/**
 * Restores one environment variable to its original value.
 */
function restoreEnvironmentVariable(name: string, value: string | undefined): void {
    if (value === undefined) {
        delete process.env[name];
        return;
    }

    process.env[name] = value;
}
