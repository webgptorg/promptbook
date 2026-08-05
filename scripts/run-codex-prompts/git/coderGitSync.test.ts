import type { CoderCommitScope } from './coderCommitScope';
import { captureCoderCommitScope, resolveCoderCommitScopePaths } from './coderCommitScope';
import {
    $commitCoderChanges,
    $pullCoderChanges,
    $startCoderGitSync,
    DISABLED_CODER_GIT_SYNC_OPTIONS,
} from './coderGitSync';
import { commitChanges } from './commitChanges';
import { pullLatestChanges } from './pullLatestChanges';

jest.mock('./coderCommitScope', () => ({
    captureCoderCommitScope: jest.fn(),
    resolveCoderCommitScopePaths: jest.fn(),
}));

jest.mock('./commitChanges', () => ({
    commitChanges: jest.fn(),
}));

jest.mock('./pullLatestChanges', () => ({
    pullLatestChanges: jest.fn(),
}));

/**
 * Commit scope of a project which the tested command is about to change.
 */
const COMMIT_SCOPE: CoderCommitScope = {
    projectPath: '/project',
    snapshotBeforeOperation: { changedFileHashes: new Map() },
};

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
 * Makes the commit scope report the given paths as changed by the current command.
 */
function mockChangedPathsOfCurrentCommand(changedPaths: ReadonlyArray<string>): void {
    (resolveCoderCommitScopePaths as jest.MockedFunction<typeof resolveCoderCommitScopePaths>).mockResolvedValue(
        changedPaths,
    );
}

describe('$startCoderGitSync', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        jest.spyOn(console, 'info').mockImplementation(() => undefined);
        (captureCoderCommitScope as jest.MockedFunction<typeof captureCoderCommitScope>).mockResolvedValue(
            COMMIT_SCOPE,
        );
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('captures the commit scope of the project the command is about to change', async () => {
        const commitScope = await $startCoderGitSync({
            gitSync: { isCommitEnabled: true, isAutoPushEnabled: false, isAutoPullEnabled: false },
            projectPath: '/project',
        });

        expect(captureCoderCommitScope).toHaveBeenCalledWith('/project');
        expect(commitScope).toBe(COMMIT_SCOPE);
    });

    it('touches git at all only when the command really commits, so it also works outside a repository', async () => {
        await $startCoderGitSync({ gitSync: DISABLED_CODER_GIT_SYNC_OPTIONS, projectPath: '/project' });

        expect(captureCoderCommitScope).not.toHaveBeenCalled();
        expect(getPullLatestChangesMock()).not.toHaveBeenCalled();
    });

    it('captures the commit scope only after the latest changes have been pulled', async () => {
        const callOrder: string[] = [];
        getPullLatestChangesMock().mockImplementation(async () => {
            callOrder.push('pull');
        });
        (captureCoderCommitScope as jest.MockedFunction<typeof captureCoderCommitScope>).mockImplementation(
            async () => {
                callOrder.push('capture');
                return COMMIT_SCOPE;
            },
        );

        await $startCoderGitSync({
            gitSync: { isCommitEnabled: true, isAutoPushEnabled: false, isAutoPullEnabled: true },
            projectPath: '/project',
        });

        expect(callOrder).toEqual(['pull', 'capture']);
    });
});

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
        mockChangedPathsOfCurrentCommand(['prompts/2026-08-04-0000-foo.md']);

        await $commitCoderChanges({
            gitSync: DISABLED_CODER_GIT_SYNC_OPTIONS,
            commitMessage: 'Initialize ptbk coder configuration',
            commitScope: COMMIT_SCOPE,
        });

        expect(getCommitChangesMock()).not.toHaveBeenCalled();
    });

    it('commits only the files the command has changed without pushing them when auto push is disabled', async () => {
        mockChangedPathsOfCurrentCommand(['prompts/2026-08-04-0000-foo.md']);

        await $commitCoderChanges({
            gitSync: { isCommitEnabled: true, isAutoPushEnabled: false, isAutoPullEnabled: false },
            commitMessage: 'Initialize ptbk coder configuration',
            commitScope: COMMIT_SCOPE,
        });

        expect(getCommitChangesMock()).toHaveBeenCalledWith('Initialize ptbk coder configuration', {
            projectPath: '/project',
            relevantPaths: ['prompts/2026-08-04-0000-foo.md'],
            autoPush: false,
        });
    });

    it('pushes the created commit when auto push is enabled', async () => {
        mockChangedPathsOfCurrentCommand(['prompts/2026-08-04-0000-foo.md']);

        await $commitCoderChanges({
            gitSync: { isCommitEnabled: true, isAutoPushEnabled: true, isAutoPullEnabled: false },
            commitMessage: 'Initialize ptbk coder configuration',
            commitScope: COMMIT_SCOPE,
        });

        expect(getCommitChangesMock()).toHaveBeenCalledWith('Initialize ptbk coder configuration', {
            projectPath: '/project',
            relevantPaths: ['prompts/2026-08-04-0000-foo.md'],
            autoPush: true,
        });
    });

    it('creates no empty commit when the command has changed nothing', async () => {
        mockChangedPathsOfCurrentCommand([]);

        await $commitCoderChanges({
            gitSync: { isCommitEnabled: true, isAutoPushEnabled: true, isAutoPullEnabled: false },
            commitMessage: 'Initialize ptbk coder configuration',
            commitScope: COMMIT_SCOPE,
        });

        expect(getCommitChangesMock()).not.toHaveBeenCalled();
    });

    it('leaves changes which were already in the working tree before the command uncommitted', async () => {
        mockChangedPathsOfCurrentCommand(['prompts/2026-08-04-0000-foo.md']);

        await $commitCoderChanges({
            gitSync: { isCommitEnabled: true, isAutoPushEnabled: false, isAutoPullEnabled: false },
            commitMessage: 'Initialize ptbk coder configuration',
            commitScope: COMMIT_SCOPE,
        });

        expect(getCommitChangesMock()).toHaveBeenCalledWith(
            'Initialize ptbk coder configuration',
            expect.objectContaining({
                relevantPaths: expect.not.arrayContaining(['src/unrelated-work-in-progress.ts']),
            }),
        );
    });
});
