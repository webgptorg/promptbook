import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { resolveLocalAgentRootPath } from '../localChatRunner/ensureLocalAgentFolder';
import {
    assignAgentProjectPort,
    listAgentProjectRuntimes,
    startAgentProjectStaticRuntime,
    terminateAgentProjectRuntimeForProject,
    terminateAllAgentProjectRuntimes,
} from './agentProjectRuntimeRegistry';

jest.mock('../localChatRunner/ensureLocalAgentFolder', () => ({
    resolveLocalAgentRootPath: jest.fn(),
    createLocalAgentDirectoryName: (agentPermanentId: string) => `agent-${agentPermanentId}`,
}));

/**
 * Mocked local-agent root resolver.
 */
const resolveLocalAgentRootPathMock = resolveLocalAgentRootPath as jest.MockedFunction<
    typeof resolveLocalAgentRootPath
>;

describe('agentProjectRuntimeRegistry', () => {
    let temporaryDirectory: string | null = null;

    beforeEach(async () => {
        temporaryDirectory = await mkdtemp(join(tmpdir(), 'promptbook-project-runtime-'));
        resolveLocalAgentRootPathMock.mockReturnValue(temporaryDirectory);
    });

    afterEach(async () => {
        await terminateAllAgentProjectRuntimes();

        if (temporaryDirectory) {
            await rm(temporaryDirectory, { recursive: true, force: true });
            temporaryDirectory = null;
        }

        jest.clearAllMocks();
    });

    it('assigns one reusable port per project', async () => {
        await createProject(temporaryDirectory!, 'abc123', 'website');

        const firstRuntime = await assignAgentProjectPort({
            agentPermanentId: 'abc123',
            projectName: 'website',
        });
        const secondRuntime = await assignAgentProjectPort({
            agentPermanentId: 'abc123',
            projectName: 'website',
        });

        expect(secondRuntime.id).toBe(firstRuntime.id);
        expect(secondRuntime.port).toBe(firstRuntime.port);
        expect(secondRuntime.mode).toBe('assigned-port');
        expect(secondRuntime.isRunning).toBe(false);
    });

    it('serves project files through a static runtime and terminates it', async () => {
        await createProject(temporaryDirectory!, 'abc123', 'website', {
            'index.html': '<h1>Runnable project</h1>',
        });

        const runtime = await startAgentProjectStaticRuntime({
            agentPermanentId: 'abc123',
            projectName: 'website',
        });

        expect(runtime.mode).toBe('static-server');
        expect(runtime.isRunning).toBe(true);

        const response = await fetch(runtime.url);
        await expect(response.text()).resolves.toContain('Runnable project');

        const terminatedRuntime = await terminateAgentProjectRuntimeForProject({
            agentPermanentId: 'abc123',
            projectName: 'website',
        });
        const runtimes = await listAgentProjectRuntimes();

        expect(terminatedRuntime?.id).toBe(runtime.id);
        expect(runtimes).toHaveLength(0);
    });
});

/**
 * Creates one project folder for runtime tests.
 */
async function createProject(
    rootPath: string,
    agentPermanentId: string,
    projectName: string,
    files: Readonly<Record<string, string>> = {},
): Promise<void> {
    const projectPath = join(rootPath, `agent-${agentPermanentId}`, 'projects', projectName);

    await mkdir(projectPath, { recursive: true });

    for (const [fileName, content] of Object.entries(files)) {
        await writeFile(join(projectPath, fileName), content, 'utf-8');
    }
}
