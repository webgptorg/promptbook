import { $execCommand } from '../../../src/utils/execCommand/$execCommand';
import { pullLatestChanges } from './pullLatestChanges';
import { runGitCommand } from './runGitCommand';

jest.mock('../../../src/utils/execCommand/$execCommand', () => ({
    $execCommand: jest.fn(),
}));

jest.mock('./runGitCommand', () => ({
    runGitCommand: jest.fn(),
}));

/**
 * Typed Jest mock for the command runner utility.
 */
type ExecCommandMock = jest.MockedFunction<typeof $execCommand>;

/**
 * Returns only the command strings passed to `$execCommand`.
 */
function getCalledCommands(execMock: ExecCommandMock): string[] {
    return execMock.mock.calls.map(([options]) => (typeof options === 'string' ? options : options.command));
}

describe('pullLatestChanges', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        (runGitCommand as jest.MockedFunction<typeof runGitCommand>).mockResolvedValue('');
    });

    it('uses the tracked upstream branch when it exists', async () => {
        const execMock = $execCommand as ExecCommandMock;
        execMock.mockImplementation(async (options) => {
            const command = typeof options === 'string' ? options : options.command;

            if (command === 'git rev-parse --abbrev-ref --symbolic-full-name @{upstream}') {
                return 'origin/main';
            }

            throw new Error(`Unexpected command: ${command}`);
        });

        await pullLatestChanges();

        expect(runGitCommand).toHaveBeenCalledWith({
            command: 'git pull --rebase',
            cwd: process.cwd(),
        });
    });

    it('pulls from the preferred remote when the branch has no upstream yet', async () => {
        const execMock = $execCommand as ExecCommandMock;
        execMock.mockImplementation(async (options) => {
            const command = typeof options === 'string' ? options : options.command;

            if (command === 'git rev-parse --abbrev-ref --symbolic-full-name @{upstream}') {
                throw new Error('fatal: no upstream configured');
            }

            if (command === 'git rev-parse --abbrev-ref HEAD') {
                return 'feature/auto-pull';
            }

            if (command === 'git config --get "remote.pushDefault"') {
                throw new Error('not set');
            }

            if (command === 'git config --get "branch.feature/auto-pull.remote"') {
                throw new Error('not set');
            }

            if (command === 'git remote') {
                return 'origin\nupstream';
            }

            throw new Error(`Unexpected command: ${command}`);
        });

        await pullLatestChanges();

        expect(runGitCommand).toHaveBeenCalledWith({
            command: 'git pull --rebase "origin" "feature/auto-pull"',
            cwd: process.cwd(),
        });
    });

    it('fails with actionable guidance when detached HEAD mode prevents auto-pull', async () => {
        const execMock = $execCommand as ExecCommandMock;
        execMock.mockImplementation(async (options) => {
            const command = typeof options === 'string' ? options : options.command;

            if (command === 'git rev-parse --abbrev-ref --symbolic-full-name @{upstream}') {
                throw new Error('fatal: no upstream configured');
            }

            if (command === 'git rev-parse --abbrev-ref HEAD') {
                return 'HEAD';
            }

            throw new Error(`Unexpected command: ${command}`);
        });

        await expect(pullLatestChanges()).rejects.toThrow(/detached HEAD mode/);
        expect(getCalledCommands(execMock)).toEqual([
            'git rev-parse --abbrev-ref --symbolic-full-name @{upstream}',
            'git rev-parse --abbrev-ref HEAD',
        ]);
    });
});
