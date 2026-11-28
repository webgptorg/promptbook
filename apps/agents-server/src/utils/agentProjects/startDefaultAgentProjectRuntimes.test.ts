import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { resolveLocalAgentRootPath } from '../localChatRunner/ensureLocalAgentFolder';
import { setAgentProjectRuntimeDesiredState } from './agentProjectRuntimeDesiredState';
import {
    PTBK_AGENT_PROJECT_DOMAINS_FILE_ENV,
    PTBK_AGENT_PROJECT_DOMAIN_REGISTRY_FILE_ENV,
    PTBK_AGENT_PROJECT_RUNTIME_DESIRED_STATE_FILE_ENV,
    PTBK_AGENT_PROJECT_RUNTIME_REGISTRY_FILE_ENV,
} from './agentProjectRuntimePaths';
import { PTBK_AGENT_PROJECT_RUNTIME_PM2_ENABLED_ENV } from './agentProjectRuntimePm2';
import {
    listAgentProjectRuntimes,
    terminateAllAgentProjectRuntimes,
    resolveAgentProjectRuntime,
} from './agentProjectRuntimeRegistry';
import { listAllLocalAgentProjectIdentities } from './listAllLocalAgentProjectIdentities';
import { startDefaultAgentProjectRuntimes } from './startDefaultAgentProjectRuntimes';

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

/**
 * Environment snapshot restored after each test.
 */
const ORIGINAL_ENVIRONMENT = {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    PTBK_AGENT_PROJECT_DOMAINS_FILE: process.env[PTBK_AGENT_PROJECT_DOMAINS_FILE_ENV],
    PTBK_AGENT_PROJECT_DOMAIN_REGISTRY_FILE: process.env[PTBK_AGENT_PROJECT_DOMAIN_REGISTRY_FILE_ENV],
    PTBK_AGENT_PROJECT_RUNTIME_DESIRED_STATE_FILE: process.env[PTBK_AGENT_PROJECT_RUNTIME_DESIRED_STATE_FILE_ENV],
    PTBK_AGENT_PROJECT_RUNTIME_PM2_ENABLED: process.env[PTBK_AGENT_PROJECT_RUNTIME_PM2_ENABLED_ENV],
    PTBK_AGENT_PROJECT_RUNTIME_REGISTRY_FILE: process.env[PTBK_AGENT_PROJECT_RUNTIME_REGISTRY_FILE_ENV],
    SERVERS: process.env.SERVERS,
};

describe('startDefaultAgentProjectRuntimes', () => {
    let temporaryDirectory: string | null = null;

    beforeEach(async () => {
        temporaryDirectory = await mkdtemp(join(tmpdir(), 'promptbook-project-autostart-'));
        process.env[PTBK_AGENT_PROJECT_DOMAINS_FILE_ENV] = join(temporaryDirectory, 'domains.txt');
        process.env[PTBK_AGENT_PROJECT_DOMAIN_REGISTRY_FILE_ENV] = join(temporaryDirectory, 'domains.json');
        process.env[PTBK_AGENT_PROJECT_RUNTIME_DESIRED_STATE_FILE_ENV] = join(
            temporaryDirectory,
            'desired-states.json',
        );
        process.env[PTBK_AGENT_PROJECT_RUNTIME_PM2_ENABLED_ENV] = '0';
        process.env[PTBK_AGENT_PROJECT_RUNTIME_REGISTRY_FILE_ENV] = join(temporaryDirectory, 'runtimes.json');
        delete process.env.NEXT_PUBLIC_SITE_URL;
        delete process.env.SERVERS;
        resolveLocalAgentRootPathMock.mockReturnValue(temporaryDirectory);
    });

    afterEach(async () => {
        await terminateAllAgentProjectRuntimes();

        if (temporaryDirectory) {
            await rm(temporaryDirectory, { recursive: true, force: true });
            temporaryDirectory = null;
        }

        jest.clearAllMocks();
        restoreEnvironmentVariable('NEXT_PUBLIC_SITE_URL', ORIGINAL_ENVIRONMENT.NEXT_PUBLIC_SITE_URL);
        restoreEnvironmentVariable(
            PTBK_AGENT_PROJECT_DOMAINS_FILE_ENV,
            ORIGINAL_ENVIRONMENT.PTBK_AGENT_PROJECT_DOMAINS_FILE,
        );
        restoreEnvironmentVariable(
            PTBK_AGENT_PROJECT_DOMAIN_REGISTRY_FILE_ENV,
            ORIGINAL_ENVIRONMENT.PTBK_AGENT_PROJECT_DOMAIN_REGISTRY_FILE,
        );
        restoreEnvironmentVariable(
            PTBK_AGENT_PROJECT_RUNTIME_DESIRED_STATE_FILE_ENV,
            ORIGINAL_ENVIRONMENT.PTBK_AGENT_PROJECT_RUNTIME_DESIRED_STATE_FILE,
        );
        restoreEnvironmentVariable(
            PTBK_AGENT_PROJECT_RUNTIME_PM2_ENABLED_ENV,
            ORIGINAL_ENVIRONMENT.PTBK_AGENT_PROJECT_RUNTIME_PM2_ENABLED,
        );
        restoreEnvironmentVariable(
            PTBK_AGENT_PROJECT_RUNTIME_REGISTRY_FILE_ENV,
            ORIGINAL_ENVIRONMENT.PTBK_AGENT_PROJECT_RUNTIME_REGISTRY_FILE,
        );
        restoreEnvironmentVariable('SERVERS', ORIGINAL_ENVIRONMENT.SERVERS);
    });

    it('finds every project of every agent on disk', async () => {
        await createProject(temporaryDirectory!, 'abc123', 'website');
        await createProject(temporaryDirectory!, 'abc123', 'landing');
        await createProject(temporaryDirectory!, 'xyz789', 'shop');
        await mkdir(join(temporaryDirectory!, 'not-an-agent-folder'), { recursive: true });

        await expect(listAllLocalAgentProjectIdentities()).resolves.toEqual([
            { agentPermanentId: 'abc123', projectName: 'landing' },
            { agentPermanentId: 'abc123', projectName: 'website' },
            { agentPermanentId: 'xyz789', projectName: 'shop' },
        ]);
    });

    it('starts every project which was never stopped', async () => {
        await createProject(temporaryDirectory!, 'abc123', 'website', { 'index.html': '<h1>Website</h1>' });
        await createProject(temporaryDirectory!, 'xyz789', 'shop', { 'index.html': '<h1>Shop</h1>' });

        const report = await startDefaultAgentProjectRuntimes();

        expect(report).toEqual({
            startedProjectCount: 2,
            runningProjectCount: 0,
            stoppedProjectCount: 0,
            failedProjectCount: 0,
        });

        const runtimes = await listAgentProjectRuntimes();
        expect(runtimes).toHaveLength(2);
        expect(runtimes.every((runtime) => runtime.isRunning)).toBe(true);
    });

    it('leaves an explicitly stopped project stopped', async () => {
        await createProject(temporaryDirectory!, 'abc123', 'website', { 'index.html': '<h1>Website</h1>' });
        await setAgentProjectRuntimeDesiredState({
            agentPermanentId: 'abc123',
            projectName: 'website',
            desiredState: 'stopped',
        });

        const report = await startDefaultAgentProjectRuntimes();

        expect(report.stoppedProjectCount).toBe(1);
        expect(report.startedProjectCount).toBe(0);
        await expect(listAgentProjectRuntimes()).resolves.toHaveLength(0);
    });

    it('keeps an already running project on its port', async () => {
        await createProject(temporaryDirectory!, 'abc123', 'website', { 'index.html': '<h1>Website</h1>' });

        await startDefaultAgentProjectRuntimes();
        const startedRuntime = await resolveAgentProjectRuntime('abc123', 'website');
        const report = await startDefaultAgentProjectRuntimes();
        const unchangedRuntime = await resolveAgentProjectRuntime('abc123', 'website');

        expect(report.runningProjectCount).toBe(1);
        expect(report.startedProjectCount).toBe(0);
        expect(unchangedRuntime?.port).toBe(startedRuntime?.port);
    });
});

/**
 * Creates one project folder for automatic start tests.
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

/**
 * Restores one optional environment variable after a test case.
 */
function restoreEnvironmentVariable(key: string, value: string | undefined): void {
    if (value === undefined) {
        delete process.env[key];
        return;
    }

    process.env[key] = value;
}
