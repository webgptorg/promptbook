import { mkdir, mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { $execCommand } from '../../../src/utils/execCommand/$execCommand';
import {
    PROMPTBOOK_AGENT_RUNNER_GITHUB_OWNER_ENV,
    PROMPTBOOK_AGENT_RUNNER_GITHUB_TOKEN_ENV,
    synchronizeGithubAgentRunnerRepositories,
} from './synchronizeGithubAgentRunnerRepositories';
import { createAgentIgnoreMatcher } from './agentIgnorePatterns';

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
        global.fetch = jest.fn().mockResolvedValue(
            createGithubRepositoriesResponse([
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
            ]),
        );
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

    it('discovers private repositories through the authenticated GitHub repository listing', async () => {
        temporaryRootDirectory = await createTemporaryRootDirectory();
        global.fetch = jest.fn().mockImplementation(async (input: Parameters<typeof fetch>[0]) => {
            const url = String(input);

            if (url.startsWith('https://api.github.com/user/repos')) {
                return createGithubRepositoriesResponse([
                    {
                        name: 'agent-private',
                        full_name: 'promptbook/agent-private',
                        clone_url: 'https://github.com/promptbook/agent-private.git',
                        private: true,
                        owner: {
                            login: 'promptbook',
                        },
                    },
                    {
                        name: 'agent-foreign',
                        full_name: 'another-owner/agent-foreign',
                        clone_url: 'https://github.com/another-owner/agent-foreign.git',
                        private: true,
                        owner: {
                            login: 'another-owner',
                        },
                    },
                ]);
            }

            return createGithubRepositoriesResponse([]);
        });

        const result = await synchronizeGithubAgentRunnerRepositories(temporaryRootDirectory);

        expect(result.clonedRepositoryNames).toEqual(['agent-private']);
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/user/repos?'), expect.any(Object));
        expect($execCommand).toHaveBeenCalledWith(
            expect.objectContaining({
                command: expect.stringContaining(
                    'https://x-access-token:token-123@github.com/promptbook/agent-private.git',
                ),
            }),
        );
    });

    it('keeps owner endpoint fallback for public repositories outside the authenticated repository list', async () => {
        temporaryRootDirectory = await createTemporaryRootDirectory();
        global.fetch = jest.fn().mockImplementation(async (input: Parameters<typeof fetch>[0]) => {
            const url = String(input);

            if (url.startsWith('https://api.github.com/user/repos')) {
                return createGithubRepositoriesResponse([]);
            }

            if (url.startsWith('https://api.github.com/users/promptbook/repos')) {
                return createGithubRepositoriesResponse([
                    {
                        name: 'agent-public',
                        full_name: 'promptbook/agent-public',
                        clone_url: 'https://github.com/promptbook/agent-public.git',
                    },
                ]);
            }

            return createGithubNotFoundResponse();
        });

        const result = await synchronizeGithubAgentRunnerRepositories(temporaryRootDirectory);

        expect(result.clonedRepositoryNames).toEqual(['agent-public']);
    });

    it('keeps owner endpoint discovery when the authenticated listing is unavailable', async () => {
        temporaryRootDirectory = await createTemporaryRootDirectory();
        global.fetch = jest.fn().mockImplementation(async (input: Parameters<typeof fetch>[0]) => {
            const url = String(input);

            if (url.startsWith('https://api.github.com/user/repos')) {
                return createGithubErrorResponse(403, 'Forbidden');
            }

            if (url.startsWith('https://api.github.com/users/promptbook/repos')) {
                return createGithubNotFoundResponse();
            }

            if (url.startsWith('https://api.github.com/orgs/promptbook/repos')) {
                return createGithubRepositoriesResponse([
                    {
                        name: 'agent-org-private',
                        full_name: 'promptbook/agent-org-private',
                        clone_url: 'https://github.com/promptbook/agent-org-private.git',
                        private: true,
                    },
                ]);
            }

            return createGithubNotFoundResponse();
        });

        const result = await synchronizeGithubAgentRunnerRepositories(temporaryRootDirectory);

        expect(result.clonedRepositoryNames).toEqual(['agent-org-private']);
    });

    it('does not clone missing repositories ignored by remote agent name', async () => {
        temporaryRootDirectory = await createTemporaryRootDirectory();
        global.fetch = jest.fn().mockImplementation(async (input: Parameters<typeof fetch>[0]) => {
            const url = String(input);

            if (url.startsWith('https://api.github.com/user/repos')) {
                return createGithubRepositoriesResponse([
                    {
                        name: 'agent-john-id',
                        full_name: 'promptbook/agent-john-id',
                        clone_url: 'https://github.com/promptbook/agent-john-id.git',
                        owner: {
                            login: 'promptbook',
                        },
                    },
                    {
                        name: 'agent-active',
                        full_name: 'promptbook/agent-active',
                        clone_url: 'https://github.com/promptbook/agent-active.git',
                        owner: {
                            login: 'promptbook',
                        },
                    },
                ]);
            }

            if (url.startsWith('https://api.github.com/repos/promptbook/agent-john-id/contents/agent.book')) {
                return createGithubFileResponse('John Smith\n');
            }

            if (url.startsWith('https://api.github.com/repos/promptbook/agent-active/contents/agent.book')) {
                return createGithubFileResponse('Active Agent\n');
            }

            return createGithubRepositoriesResponse([]);
        });

        const result = await synchronizeGithubAgentRunnerRepositories(temporaryRootDirectory, {
            ignoreMatcher: createAgentIgnoreMatcher(['john*']),
        });

        expect(result.clonedRepositoryNames).toEqual(['agent-active']);
        expect(result.ignoredRepositoryNames).toEqual(['agent-john-id']);
        expect($execCommand).toHaveBeenCalledTimes(1);
        expect($execCommand).toHaveBeenCalledWith(
            expect.objectContaining({
                command: expect.stringContaining('agent-active'),
            }),
        );
    });
});

/**
 * Creates one mocked GitHub repository-list response.
 */
function createGithubRepositoriesResponse(repositories: ReadonlyArray<Record<string, unknown>>): Response {
    return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => repositories,
    } satisfies Partial<Response> as Response;
}

/**
 * Creates one mocked GitHub file-content response.
 */
function createGithubFileResponse(content: string): Response {
    return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
            content: Buffer.from(content, 'utf-8').toString('base64'),
            encoding: 'base64',
        }),
    } satisfies Partial<Response> as Response;
}

/**
 * Creates one mocked GitHub not-found response.
 */
function createGithubNotFoundResponse(): Response {
    return createGithubErrorResponse(404, 'Not Found');
}

/**
 * Creates one mocked GitHub error response.
 */
function createGithubErrorResponse(status: number, statusText: string): Response {
    return {
        ok: false,
        status,
        statusText,
        json: async () => ({
            message: statusText,
        }),
    } satisfies Partial<Response> as Response;
}
