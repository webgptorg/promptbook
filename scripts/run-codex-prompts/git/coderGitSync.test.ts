import { $commitCoderChanges, $pullCoderChanges, DISABLED_CODER_GIT_SYNC_OPTIONS } from './coderGitSync';
import { commitChanges } from './commitChanges';
import { pullLatestChanges } from './pullLatestChanges';
import { runGitCommand } from './runGitCommand';

jest.mock('./commitChanges', () => ({
    commitChanges: jest.fn(),
}));

jest.mock('./pullLatestChanges', () => ({
    pullLatestChanges: jest.fn(),
}));

jest.mock('./runGitCommand', () => ({
    runGitCommand: jest.fn(),
}));

/**
 * Typed Jest mock for the commit utility.
 */
function getCommitChangesMock(): jest.MockedFunction<typeof commitChanges> {
    return commitChanges as jest.MockedFunction<typeof commitChanges>;
}

/**
 * Typed Jest mock for the pull utility.
 */
function getPullLatestChangesMock(): jest.MockedFunction<typeof pullLatestChanges> {
    return pullLatestChanges as jest.MockedFunction<typeof pullLatestChanges>;
}

/**
 * Makes `git status --porcelain` report the given working tree state.
 */
function mockWorkingTreeStatus(gitStatus: string): void {
    (runGitCommand as jest.MockedFunction<typeof runGitCommand>).mockResolvedValue(gitStatus);
}

describe('$pullCoderChanges', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        jest.spyOn(console, 'info').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('leaves the repository untouched when auto pull is disabled', async () => {
        await $pullCoderChanges({ gitSync: DISABLED_CODER_GIT_SYNC_OPTIONS, projectPath: '/project' });

        expect(getPullLatestChangesMock()).not.toHaveBeenCalled();
    });

    it('pulls the latest changes of the given project when auto pull is enabled', async () => {
        await $pullCoderChanges({
            gitSync: { isCommitEnabled: false, isAutoPushEnabled: false, isAutoPullEnabled: true },
            projectPath: '/project',
        });

        expect(getPullLatestChangesMock()).toHaveBeenCalledWith('/project');
    });
});

describe('$commitCoderChanges', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        jest.spyOn(console, 'info').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('leaves the repository untouched when committing is disabled', async () => {
        mockWorkingTreeStatus(' M prompts/2026-08-04-0000-foo.md\n');

        await $commitCoderChanges({
            gitSync: DISABLED_CODER_GIT_SYNC_OPTIONS,
            commitMessage: 'Initialize ptbk coder configuration',
            projectPath: '/project',
        });

        expect(getCommitChangesMock()).not.toHaveBeenCalled();
    });

    it('commits the changes without pushing them when auto push is disabled', async () => {
        mockWorkingTreeStatus('?? prompts/2026-08-04-0000-foo.md\n');

        await $commitCoderChanges({
            gitSync: { isCommitEnabled: true, isAutoPushEnabled: false, isAutoPullEnabled: false },
            commitMessage: 'Initialize ptbk coder configuration',
            projectPath: '/project',
        });

        expect(getCommitChangesMock()).toHaveBeenCalledWith('Initialize ptbk coder configuration', {
            projectPath: '/project',
            autoPush: false,
        });
    });

    it('pushes the created commit when auto push is enabled', async () => {
        mockWorkingTreeStatus('?? prompts/2026-08-04-0000-foo.md\n');

        await $commitCoderChanges({
            gitSync: { isCommitEnabled: true, isAutoPushEnabled: true, isAutoPullEnabled: false },
            commitMessage: 'Initialize ptbk coder configuration',
            projectPath: '/project',
        });

        expect(getCommitChangesMock()).toHaveBeenCalledWith('Initialize ptbk coder configuration', {
            projectPath: '/project',
            autoPush: true,
        });
    });

    it('creates no empty commit when the working tree is clean', async () => {
        mockWorkingTreeStatus('');

        await $commitCoderChanges({
            gitSync: { isCommitEnabled: true, isAutoPushEnabled: true, isAutoPullEnabled: false },
            commitMessage: 'Initialize ptbk coder configuration',
            projectPath: '/project',
        });

        expect(runGitCommand).toHaveBeenCalledWith({
            command: 'git status --porcelain',
            cwd: '/project',
            isVerbose: false,
        });
        expect(getCommitChangesMock()).not.toHaveBeenCalled();
    });
});
