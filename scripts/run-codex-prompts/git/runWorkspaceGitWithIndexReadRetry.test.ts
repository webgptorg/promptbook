import { setTimeout as waitForTimeout } from 'timers/promises';
import { $runWorkspaceGit } from '../../../src/cli/cli-commands/common/workspaceRepository';
import { runWorkspaceGitWithIndexReadRetry } from './runWorkspaceGitWithIndexReadRetry';

jest.mock('../../../src/cli/cli-commands/common/workspaceRepository', () => ({ $runWorkspaceGit: jest.fn() }));
jest.mock('timers/promises', () => ({ setTimeout: jest.fn().mockResolvedValue(undefined) }));

/** Matches the index-open diagnostic from both ordinary repositories and private linked checkouts. */
function indexReadFailure(path = '.git/index'): Error & { stderr: string } {
    const stderr = `fatal: ${path}: index file open failed: Permission denied\n`;
    return Object.assign(new Error(stderr), { stderr });
}

describe('Windows Git index inspections', () => {
    const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform')!;

    beforeEach(() => {
        jest.mocked($runWorkspaceGit).mockReset();
        jest.mocked(waitForTimeout).mockClear();
        Object.defineProperty(process, 'platform', { value: 'win32' });
    });
    afterEach(() => Object.defineProperty(process, 'platform', originalPlatform));

    it('retries a transient ordinary or linked index read without changing raw output or options', async () => {
        const argumentsList = ['ls-files', '--others', '--exclude-standard', '-z'];
        const options = { env: { GIT_INDEX_FILE: 'private-index' } };
        const output = 'žluťoučký\0file\nname\0';
        jest.mocked($runWorkspaceGit)
            .mockRejectedValueOnce(indexReadFailure())
            .mockRejectedValueOnce(indexReadFailure('C:/fixture/.git/worktrees/tree/index'))
            .mockResolvedValueOnce(output);

        await expect(runWorkspaceGitWithIndexReadRetry('fixture', argumentsList, options)).resolves.toBe(output);
        expect($runWorkspaceGit).toHaveBeenCalledTimes(3);
        expect(jest.mocked($runWorkspaceGit).mock.calls).toEqual([
            ['fixture', argumentsList, options],
            ['fixture', argumentsList, options],
            ['fixture', argumentsList, options],
        ]);
        expect(jest.mocked(waitForTimeout).mock.calls).toEqual([[50], [100]]);
    });

    it('surfaces the original error when index access remains denied', async () => {
        const error = indexReadFailure();
        jest.mocked($runWorkspaceGit).mockRejectedValue(error);
        await expect(runWorkspaceGitWithIndexReadRetry('fixture', ['diff', '--name-only'])).rejects.toBe(error);
        expect($runWorkspaceGit).toHaveBeenCalledTimes(5);
        expect(jest.mocked(waitForTimeout).mock.calls).toEqual([[50], [100], [200], [400]]);
    });

    it.each(['commit', 'merge', 'push', 'update-index', 'read-tree'])(
        'does not repeat the %s command even when its index access fails',
        async (command) => {
            const error = indexReadFailure();
            jest.mocked($runWorkspaceGit).mockRejectedValue(error);
            await expect(runWorkspaceGitWithIndexReadRetry('fixture', [command])).rejects.toBe(error);
            expect($runWorkspaceGit).toHaveBeenCalledTimes(1);
            expect(waitForTimeout).not.toHaveBeenCalled();
        },
    );

    it.each([
        'fatal: .git/index.lock: File exists\n',
        'fatal: .git/config: Permission denied\n',
        'fatal: .git/index: index file corrupt\n',
    ])('does not retry an unrelated failure: %s', async (stderr) => {
        const error = Object.assign(new Error(stderr), { stderr });
        jest.mocked($runWorkspaceGit).mockRejectedValue(error);
        await expect(runWorkspaceGitWithIndexReadRetry('fixture', ['ls-files'])).rejects.toBe(error);
        expect($runWorkspaceGit).toHaveBeenCalledTimes(1);
        expect(waitForTimeout).not.toHaveBeenCalled();
    });

    it.each(['--output=result.patch', '--ext-diff', '--no-index'])(
        'does not repeat diff with an unsafe inspection option %s',
        async (option) => {
            const error = indexReadFailure();
            jest.mocked($runWorkspaceGit).mockRejectedValue(error);
            await expect(runWorkspaceGitWithIndexReadRetry('fixture', ['diff', '--name-only', option])).rejects.toBe(
                error,
            );
            expect($runWorkspaceGit).toHaveBeenCalledTimes(1);
            expect(waitForTimeout).not.toHaveBeenCalled();
        },
    );

    it('does not retry permission failures on Unix', async () => {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        const error = indexReadFailure();
        jest.mocked($runWorkspaceGit).mockRejectedValue(error);
        await expect(runWorkspaceGitWithIndexReadRetry('fixture', ['ls-files'])).rejects.toBe(error);
        expect($runWorkspaceGit).toHaveBeenCalledTimes(1);
        expect(waitForTimeout).not.toHaveBeenCalled();
    });

    it('preserves cancellation without delaying or restarting the inspection', async () => {
        const controller = new AbortController();
        controller.abort();
        const error = indexReadFailure();
        jest.mocked($runWorkspaceGit).mockRejectedValue(error);
        await expect(
            runWorkspaceGitWithIndexReadRetry('fixture', ['ls-files'], { signal: controller.signal }),
        ).rejects.toBe(error);
        expect($runWorkspaceGit).toHaveBeenCalledTimes(1);
        expect(waitForTimeout).not.toHaveBeenCalled();
    });
});
