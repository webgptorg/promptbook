import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { resolveLocalAgentRootPath } from '../localChatRunner/ensureLocalAgentFolder';
import {
    assignAgentProjectPort,
    listAgentProjectRuntimes,
    refreshAgentProjectRuntimePublicDomain,
    startAgentProjectStaticRuntime,
    terminateAgentProjectRuntimeForProject,
    terminateAllAgentProjectRuntimes,
} from './agentProjectRuntimeRegistry';
import { setAgentProjectCustomDomain } from './agentProjectRuntimeDomains';
import {
    PTBK_AGENT_PROJECT_DOMAINS_FILE_ENV,
    PTBK_AGENT_PROJECT_DOMAIN_REGISTRY_FILE_ENV,
    PTBK_AGENT_PROJECT_RUNTIME_REGISTRY_FILE_ENV,
} from './agentProjectRuntimePaths';
import { PTBK_AGENT_PROJECT_RUNTIME_PM2_ENABLED_ENV } from './agentProjectRuntimePm2';

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
 * Environment snapshot restored after each runtime test.
 */
const ORIGINAL_ENVIRONMENT = {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    PTBK_AGENT_PROJECT_DOMAINS_FILE: process.env[PTBK_AGENT_PROJECT_DOMAINS_FILE_ENV],
    PTBK_AGENT_PROJECT_DOMAIN_REGISTRY_FILE: process.env[PTBK_AGENT_PROJECT_DOMAIN_REGISTRY_FILE_ENV],
    PTBK_AGENT_PROJECT_RUNTIME_PM2_ENABLED: process.env[PTBK_AGENT_PROJECT_RUNTIME_PM2_ENABLED_ENV],
    PTBK_AGENT_PROJECT_RUNTIME_REGISTRY_FILE: process.env[PTBK_AGENT_PROJECT_RUNTIME_REGISTRY_FILE_ENV],
    SERVERS: process.env.SERVERS,
};

describe('agentProjectRuntimeRegistry', () => {
    let temporaryDirectory: string | null = null;

    beforeEach(async () => {
        temporaryDirectory = await mkdtemp(join(tmpdir(), 'promptbook-project-runtime-'));
        process.env[PTBK_AGENT_PROJECT_DOMAINS_FILE_ENV] = join(temporaryDirectory, 'domains.txt');
        process.env[PTBK_AGENT_PROJECT_DOMAIN_REGISTRY_FILE_ENV] = join(temporaryDirectory, 'domains.json');
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
            PTBK_AGENT_PROJECT_RUNTIME_PM2_ENABLED_ENV,
            ORIGINAL_ENVIRONMENT.PTBK_AGENT_PROJECT_RUNTIME_PM2_ENABLED,
        );
        restoreEnvironmentVariable(
            PTBK_AGENT_PROJECT_RUNTIME_REGISTRY_FILE_ENV,
            ORIGINAL_ENVIRONMENT.PTBK_AGENT_PROJECT_RUNTIME_REGISTRY_FILE,
        );
        restoreEnvironmentVariable('SERVERS', ORIGINAL_ENVIRONMENT.SERVERS);
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

    it('uses and refreshes custom project domains on runtime records', async () => {
        await createProject(temporaryDirectory!, 'abc123', 'website');
        await setAgentProjectCustomDomain({
            agentPermanentId: 'abc123',
            projectName: 'website',
            serverDomain: 'agents.example.com',
            customDomain: 'website.example.com',
        });

        const runtime = await assignAgentProjectPort({
            agentPermanentId: 'abc123',
            projectName: 'website',
            serverDomain: 'agents.example.com',
        });

        expect(runtime.domain).toBe('website.example.com');
        expect(runtime.publicUrl).toBe('https://website.example.com');

        await setAgentProjectCustomDomain({
            agentPermanentId: 'abc123',
            projectName: 'website',
            serverDomain: 'agents.example.com',
            customDomain: 'client.website.example.com',
        });

        const refreshedRuntime = await refreshAgentProjectRuntimePublicDomain({
            agentPermanentId: 'abc123',
            projectName: 'website',
            serverDomain: 'agents.example.com',
        });

        expect(refreshedRuntime?.domain).toBe('client.website.example.com');
        expect(refreshedRuntime?.publicUrl).toBe('https://client.website.example.com');
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
