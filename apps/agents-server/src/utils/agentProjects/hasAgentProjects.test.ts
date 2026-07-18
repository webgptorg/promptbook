import { mkdir, mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { AGENT_PROJECTS_DIRECTORY_PATH } from '../../../../../src/book-3.0/agentFolderPaths';
import { PTBK_AGENTS_SERVER_AGENT_ROOT_ENV } from '../localChatRunner/localChatRunnerConstants';
import { createLocalAgentDirectoryName } from '../localChatRunner/ensureLocalAgentFolder';
import { hasAgentProjects } from './hasAgentProjects';

/**
 * Original local agent root environment value restored after filesystem tests.
 */
const ORIGINAL_AGENT_ROOT = process.env[PTBK_AGENTS_SERVER_AGENT_ROOT_ENV];

describe('hasAgentProjects', () => {
    let temporaryDirectory: string | null = null;

    afterEach(async () => {
        if (temporaryDirectory) {
            await rm(temporaryDirectory, { recursive: true, force: true });
            temporaryDirectory = null;
        }

        restoreEnvironmentVariable(PTBK_AGENTS_SERVER_AGENT_ROOT_ENV, ORIGINAL_AGENT_ROOT);
    });

    it('returns false when the projects folder is missing', async () => {
        temporaryDirectory = await mkdtemp(join(tmpdir(), 'promptbook-agent-projects-'));
        process.env[PTBK_AGENTS_SERVER_AGENT_ROOT_ENV] = temporaryDirectory;

        await expect(hasAgentProjects('abc123')).resolves.toBe(false);
    });

    it('returns true when the agent has at least one project directory', async () => {
        temporaryDirectory = await mkdtemp(join(tmpdir(), 'promptbook-agent-projects-'));
        process.env[PTBK_AGENTS_SERVER_AGENT_ROOT_ENV] = temporaryDirectory;

        await mkdir(
            join(
                temporaryDirectory,
                createLocalAgentDirectoryName('abc123'),
                AGENT_PROJECTS_DIRECTORY_PATH,
                'website',
            ),
            { recursive: true },
        );

        await expect(hasAgentProjects('abc123')).resolves.toBe(true);
    });
});

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
