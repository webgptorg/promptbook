import { existsSync } from 'fs';
import { mkdir, mkdtemp, rm, utimes, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { $execCommand } from '../../../src/utils/execCommand/$execCommand';
import { buildAgentGitEnv, buildAgentGitSigningFlag } from './agentGitIdentity';
import { commitChanges } from './commitChanges';
import { forTime } from 'waitasecond';

jest.mock('../../../src/utils/execCommand/$execCommand', () => ({
    $execCommand: jest.fn(),
}));

jest.mock('waitasecond', () => ({
    forTime: jest.fn(),
}));

jest.mock('./agentGitIdentity', () => ({
    buildAgentGitEnv: jest.fn(),
    buildAgentGitSigningFlag: jest.fn(),
}));

/**
 * Original working directory restored after tests that switch to a temporary project.
 */
const ORIGINAL_WORKING_DIRECTORY = process.cwd();

/**
 * Typed Jest mock for the command runner utility.
 */
type ExecCommandMock = jest.MockedFunction<typeof $execCommand>;

/**
 * Casts the command runner to strongly-typed Jest mock.
 */
function getExecCommandMock(): ExecCommandMock {
    return $execCommand as ExecCommandMock;
}

/**
 * Typed Jest mock for the sleep helper used during git lock retries.
 */
function getForTimeMock(): jest.MockedFunction<typeof forTime> {
    return forTime as jest.MockedFunction<typeof forTime>;
}

/**
 * Builds a generic successful command result.
 */
function okResult(value = ''): Promise<string> {
    return Promise.resolve(value);
}

/**
 * Returns only the command strings passed to `$execCommand`.
 */
function getCalledCommands(execMock: ExecCommandMock): string[] {
    return execMock.mock.calls.map(([options]) => (typeof options === 'string' ? options : options.command));
}

/**
 * Creates one temporary repository-like directory with an empty `.git` folder.
 */
async function createTemporaryGitProject(): Promise<string> {
    const temporaryProjectPath = await mkdtemp(join(tmpdir(), 'ptbk-coder-git-'));
    await mkdir(join(temporaryProjectPath, '.git'), { recursive: true });
    return temporaryProjectPath;
}

describe('commitChanges', () => {
    let consoleWarnSpy: jest.SpyInstance<void, [message?: unknown, ...optionalParams: unknown[]]>;
    let temporaryProjectPath: string | undefined;

    beforeEach(() => {
        (buildAgentGitEnv as jest.MockedFunction<typeof buildAgentGitEnv>).mockReturnValue({
            GIT_AUTHOR_NAME: 'Promptbook Coding Agent',
        });
        (buildAgentGitSigningFlag as jest.MockedFunction<typeof buildAgentGitSigningFlag>).mockReturnValue(
            '--gpg-sign="test"',
        );
        getForTimeMock().mockResolvedValue(undefined);
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(async () => {
        process.chdir(ORIGINAL_WORKING_DIRECTORY);

        if (temporaryProjectPath) {
            await rm(temporaryProjectPath, { recursive: true, force: true });
            temporaryProjectPath = undefined;
        }

        consoleWarnSpy.mockRestore();
        jest.resetAllMocks();
    });

    it('does not push by default when autoPush is not enabled', async () => {
        const execMock = getExecCommandMock();
        execMock.mockImplementation(async () => okResult());

        await commitChanges('test commit');

        const calledCommands = getCalledCommands(execMock);
        expect(calledCommands).not.toContain('git push');
        expect(calledCommands).not.toContain('git rev-parse --abbrev-ref --symbolic-full-name @{upstream}');
    });

    it('unstages excluded temporary files before creating the commit', async () => {
        temporaryProjectPath = await createTemporaryGitProject();
        process.chdir(temporaryProjectPath);

        const execMock = getExecCommandMock();
        execMock.mockImplementation(async () => okResult());

        await commitChanges('test commit', {
            excludePaths: [join(temporaryProjectPath, 'prompts', '2026-04-6490.log.txt')],
        });

        const calledCommands = getCalledCommands(execMock);
        const gitAddIndex = calledCommands.indexOf('git add .');
        const gitResetIndex = calledCommands.indexOf('git reset --quiet HEAD -- "prompts/2026-04-6490.log.txt"');
        const gitCommitIndex = calledCommands.findIndex((command) => command.startsWith('git commit '));

        expect(gitAddIndex).toBeGreaterThanOrEqual(0);
        expect(gitResetIndex).toBeGreaterThan(gitAddIndex);
        expect(gitCommitIndex).toBeGreaterThan(gitResetIndex);
    });

    it('can stage only selected paths before creating the commit', async () => {
        temporaryProjectPath = await createTemporaryGitProject();
        process.chdir(temporaryProjectPath);

        const execMock = getExecCommandMock();
        execMock.mockImplementation(async () => okResult());

        await commitChanges('test commit', {
            includePaths: ['messages/queued/question.md', 'messages/finished/question.md'],
        });

        const calledCommands = getCalledCommands(execMock);
        expect(calledCommands).toContain(
            'git add --all -- "messages/queued/question.md" "messages/finished/question.md"',
        );
        expect(calledCommands).not.toContain('git add .');
    });

    it('pushes to upstream branch after commit when there are outgoing commits', async () => {
        const execMock = getExecCommandMock();
        execMock.mockImplementation(async (options) => {
            const command = typeof options === 'string' ? options : options.command;

            if (command === 'git rev-parse --abbrev-ref --symbolic-full-name @{upstream}') {
                return 'origin/main';
            }

            if (command === 'git rev-list --count @{upstream}..HEAD') {
                return '1';
            }

            return okResult();
        });

        await commitChanges('test commit', { autoPush: true });

        const calledCommands = getCalledCommands(execMock);
        expect(calledCommands).toContain('git push');
    });

    it('does not push when upstream exists and there is nothing to push', async () => {
        const execMock = getExecCommandMock();
        execMock.mockImplementation(async (options) => {
            const command = typeof options === 'string' ? options : options.command;

            if (command === 'git rev-parse --abbrev-ref --symbolic-full-name @{upstream}') {
                return 'origin/main';
            }

            if (command === 'git rev-list --count @{upstream}..HEAD') {
                return '0';
            }

            return okResult();
        });

        await commitChanges('test commit', { autoPush: true });

        const calledCommands = getCalledCommands(execMock);
        expect(calledCommands).not.toContain('git push');
    });

    it('sets upstream on first push when no upstream is configured', async () => {
        const execMock = getExecCommandMock();
        execMock.mockImplementation(async (options) => {
            const command = typeof options === 'string' ? options : options.command;

            if (command === 'git rev-parse --abbrev-ref --symbolic-full-name @{upstream}') {
                throw new Error('fatal: no upstream configured');
            }

            if (command === 'git rev-parse --abbrev-ref HEAD') {
                return 'feature/auto-push';
            }

            if (command === 'git config --get "remote.pushDefault"') {
                throw new Error('not set');
            }

            if (command === 'git config --get "branch.feature/auto-push.remote"') {
                throw new Error('not set');
            }

            if (command === 'git remote') {
                return 'origin\nupstream';
            }

            return okResult();
        });

        await commitChanges('test commit', { autoPush: true });

        const calledCommands = getCalledCommands(execMock);
        expect(calledCommands).toContain('git push --set-upstream "origin" "feature/auto-push"');
    });

    it('wraps push failures with actionable hints', async () => {
        const execMock = getExecCommandMock();
        execMock.mockImplementation(async (options) => {
            const command = typeof options === 'string' ? options : options.command;

            if (command === 'git rev-parse --abbrev-ref --symbolic-full-name @{upstream}') {
                return 'origin/main';
            }

            if (command === 'git rev-list --count @{upstream}..HEAD') {
                return '1';
            }

            if (command === 'git push') {
                throw new Error('non-fast-forward: failed to push some refs');
            }

            return okResult();
        });

        await expect(commitChanges('test commit', { autoPush: true })).rejects.toThrow(
            /Failed to push coding-agent commit to the remote repository\.[\s\S]*Local branch is behind remote history\./,
        );
    });

    it('falls back to default git config when coding-agent identity is incomplete', async () => {
        const execMock = getExecCommandMock();
        (buildAgentGitEnv as jest.MockedFunction<typeof buildAgentGitEnv>).mockReturnValue(undefined);
        (buildAgentGitSigningFlag as jest.MockedFunction<typeof buildAgentGitSigningFlag>).mockReturnValue(undefined);

        execMock.mockImplementation(async (options) => {
            const command = typeof options === 'string' ? options : options.command;

            if (command === 'git rev-parse --abbrev-ref --symbolic-full-name @{upstream}') {
                return 'origin/main';
            }

            if (command === 'git rev-list --count @{upstream}..HEAD') {
                return '1';
            }

            return okResult();
        });

        await commitChanges('test commit', { autoPush: true });

        const calledCommands = getCalledCommands(execMock);
        const commitCommand = calledCommands.find((command) => command.startsWith('git commit '));
        const gitAddCallOptions = execMock.mock.calls.find(
            ([options]) => (typeof options === 'string' ? options : options.command) === 'git add .',
        )?.[0];

        expect(commitCommand).toBeDefined();
        expect(commitCommand).toMatch(/^git commit --file ".*COMMIT_MESSAGE_\d+\.txt"$/);
        expect(commitCommand).not.toContain('--gpg-sign');
        expect(typeof gitAddCallOptions === 'string' ? undefined : gitAddCallOptions?.env).toBeUndefined();
    });

    it('retries git add when index.lock is temporarily held by another git process', async () => {
        const execMock = getExecCommandMock();
        let isFirstGitAddAttempt = true;

        execMock.mockImplementation(async (options) => {
            const command = typeof options === 'string' ? options : options.command;

            if (command === 'git add .') {
                if (isFirstGitAddAttempt) {
                    isFirstGitAddAttempt = false;
                    throw new Error(
                        "fatal: Unable to create '.git/index.lock': File exists.\nAnother git process seems to be running in this repository.",
                    );
                }

                return okResult();
            }

            if (command === 'git rev-parse --git-path index.lock') {
                return '.git/index.lock';
            }

            if (command === 'git rev-parse --abbrev-ref --symbolic-full-name @{upstream}') {
                return 'origin/main';
            }

            if (command === 'git rev-list --count @{upstream}..HEAD') {
                return '1';
            }

            return okResult();
        });

        await commitChanges('test commit', { autoPush: true });

        const calledCommands = getCalledCommands(execMock);
        expect(calledCommands.filter((command) => command === 'git add .')).toHaveLength(2);
        expect(getForTimeMock()).toHaveBeenCalledWith(250);
    });

    it('removes stale index.lock before retrying git commit', async () => {
        temporaryProjectPath = await createTemporaryGitProject();
        process.chdir(temporaryProjectPath);

        const staleIndexLockPath = join(temporaryProjectPath, '.git', 'index.lock');
        await writeFile(staleIndexLockPath, 'stale lock', 'utf-8');

        const staleDate = new Date(Date.now() - 5 * 60 * 1000);
        await utimes(staleIndexLockPath, staleDate, staleDate);

        const execMock = getExecCommandMock();
        let isFirstGitCommitAttempt = true;

        execMock.mockImplementation(async (options) => {
            const command = typeof options === 'string' ? options : options.command;

            if (command.startsWith('git commit ')) {
                if (isFirstGitCommitAttempt) {
                    isFirstGitCommitAttempt = false;
                    throw new Error(
                        `fatal: Unable to create '${staleIndexLockPath.replace(
                            /\\/g,
                            '/',
                        )}': File exists.\nAnother git process seems to be running in this repository.`,
                    );
                }

                return okResult();
            }

            if (command === 'git rev-parse --git-path index.lock') {
                return '.git/index.lock';
            }

            if (command === 'git rev-parse --abbrev-ref --symbolic-full-name @{upstream}') {
                return 'origin/main';
            }

            if (command === 'git rev-list --count @{upstream}..HEAD') {
                return '1';
            }

            return okResult();
        });

        await commitChanges('test commit', { autoPush: true });

        const calledCommands = getCalledCommands(execMock);
        expect(calledCommands.filter((command) => command.startsWith('git commit '))).toHaveLength(2);
        expect(existsSync(staleIndexLockPath)).toBe(false);
    });
});
