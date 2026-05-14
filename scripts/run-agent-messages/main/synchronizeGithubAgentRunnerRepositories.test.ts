import { mkdir, mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { $execCommand } from '../../../src/utils/execCommand/$execCommand';
import {
    PROMPTBOOK_AGENT_RUNNER_GITHUB_OWNER_ENV,
    PROMPTBOOK_AGENT_RUNNER_GITHUB_TOKEN_ENV,
    synchronizeGithubAgentRunnerRepositories,
} from './synchronizeGithubAgentRunnerRepositories';

jest.mock('../../../src/utils/execCommand/$execCommand', () => ({
    $execCommand: jest.fn(),
}));

/**
 * Creates one temporary root directory for GitHub synchronization tests.
 */
async function createTemporaryRootDirectory(): Promise<string> {
    return mkdtemp(join(tmpdir(), 'ptbk-agent-github-sync-'));
}

describe('synchronizeGithubAgentRunnerRepositories', () => {
    let temporaryRootDirectory: string | undefined;
    let originalFetch: typeof fetch | undefined;
    let originalToken: string | undefined;
    let originalOwner: string | undefined;

    beforeEach(() => {
        jest.clearAllMocks();
        originalFetch = global.fetch;
        originalToken = process.env[PROMPTBOOK_AGENT_RUNNER_GITHUB_TOKEN_ENV];
        originalOwner = process.env[PROMPTBOOK_AGENT_RUNNER_GITHUB_OWNER_ENV];
        process.env[PROMPTBOOK_AGENT_RUNNER_GITHUB_TOKEN_ENV] = 'token-123';
        process.env[PROMPTBOOK_AGENT_RUNNER_GITHUB_OWNER_ENV] = 'promptbook';
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: async () => [
                {
                    name: 'agent-alpha',
                    full_name: 'promptbook/agent-alpha',
                    clone_url: 'https://github.com/promptbook/agent-alpha.git',
                },
                {
                    name: 'not-an-agent',
                    full_name: 'promptbook/not-an-agent',
                    clone_url: 'https://github.com/promptbook/not-an-agent.git',
                },
            ],
        } satisfies Partial<Response> as Response);
        ($execCommand as jest.MockedFunction<typeof $execCommand>).mockResolvedValue('');
    });

    afterEach(async () => {
        if (temporaryRootDirectory) {
            await rm(temporaryRootDirectory, { recursive: true, force: true });
            temporaryRootDirectory = undefined;
        }

        if (originalFetch) {
            global.fetch = originalFetch;
        }

        if (originalToken === undefined) {
            delete process.env[PROMPTBOOK_AGENT_RUNNER_GITHUB_TOKEN_ENV];
        } else {
            process.env[PROMPTBOOK_AGENT_RUNNER_GITHUB_TOKEN_ENV] = originalToken;
        }

        if (originalOwner === undefined) {
            delete process.env[PROMPTBOOK_AGENT_RUNNER_GITHUB_OWNER_ENV];
        } else {
            process.env[PROMPTBOOK_AGENT_RUNNER_GITHUB_OWNER_ENV] = originalOwner;
        }
    });

    it('clones only missing remote repositories whose names start with `agent-`', async () => {
        temporaryRootDirectory = await createTemporaryRootDirectory();
        await mkdir(join(temporaryRootDirectory, 'agent-alpha'), { recursive: true });

        const result = await synchronizeGithubAgentRunnerRepositories(temporaryRootDirectory);

        expect(result.clonedRepositoryNames).toEqual([]);
        expect($execCommand).not.toHaveBeenCalled();
    });

    it('clones missing remote `agent-*` repositories into the root directory', async () => {
        temporaryRootDirectory = await createTemporaryRootDirectory();

        const result = await synchronizeGithubAgentRunnerRepositories(temporaryRootDirectory);

        expect(result.clonedRepositoryNames).toEqual(['agent-alpha']);
        expect($execCommand).toHaveBeenCalledWith(
            expect.objectContaining({
                command: expect.stringContaining('git clone --quiet'),
                cwd: temporaryRootDirectory,
                isVerbose: false,
            }),
        );
    });
});
