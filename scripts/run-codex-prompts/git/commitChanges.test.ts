import { $execCommand } from '../../../src/utils/execCommand/$execCommand';
import { buildAgentGitEnv, buildAgentGitSigningFlag } from './agentGitIdentity';
import { commitChanges } from './commitChanges';

jest.mock('../../../src/utils/execCommand/$execCommand', () => ({
    $execCommand: jest.fn(),
}));

jest.mock('./agentGitIdentity', () => ({
    buildAgentGitEnv: jest.fn(),
    buildAgentGitSigningFlag: jest.fn(),
}));

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
 * Builds a generic successful command result.
 */
function okResult(value = ''): Promise<string> {
    return Promise.resolve(value);
}

describe('commitChanges', () => {
    beforeEach(() => {
        (buildAgentGitEnv as jest.MockedFunction<typeof buildAgentGitEnv>).mockReturnValue({
            GIT_AUTHOR_NAME: 'Promptbook Coding Agent',
        });
        (buildAgentGitSigningFlag as jest.MockedFunction<typeof buildAgentGitSigningFlag>).mockReturnValue(
            '--gpg-sign="test"',
        );
    });

    afterEach(() => {
        jest.resetAllMocks();
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

        await commitChanges('test commit');

        const calledCommands = execMock.mock.calls.map(([options]) => (typeof options === 'string' ? options : options.command));
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

        await commitChanges('test commit');

        const calledCommands = execMock.mock.calls.map(([options]) => (typeof options === 'string' ? options : options.command));
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

        await commitChanges('test commit');

        const calledCommands = execMock.mock.calls.map(([options]) => (typeof options === 'string' ? options : options.command));
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

        await expect(commitChanges('test commit')).rejects.toThrow(
            /Failed to push coding-agent commit to the remote repository\.[\s\S]*Local branch is behind remote history\./,
        );
    });
});
