import { execFile } from 'child_process';
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import {
    $resolveWorkspaceRepository,
    $runWorkspaceGit,
} from '../../../src/cli/cli-commands/common/workspaceRepository';
import { NotAllowed } from '../../../src/errors/NotAllowed';
import { resolvePromptbookTemporaryPath } from '../../../src/utils/filesystem/promptbookTemporaryPath';
import { listWorkingTreeChangedFiles } from '../git/workingTreeChanges';
import { withCoderWorkspaceLock } from './withCoderWorkspaceLock';

/** Runs fixture Git commands without a shell or changes to the invoking repository. */
const EXECUTE_FILE = promisify(execFile);

/** Workspace lock name checked independently of the implementation's path construction. */
const LOCK_FILENAME = 'ptbk-coder-workspace.lock';

/** Reads all Git metadata bytes so lock acquisition and release cannot silently modify existing files. */
async function readDirectoryFiles(directory: string): Promise<Map<string, string>> {
    const files = new Map<string, string>();
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const entryPath = join(directory, entry.name);
        if (entry.isDirectory()) {
            for (const [path, content] of await readDirectoryFiles(entryPath)) {
                files.set(join(entry.name, path), content);
            }
        } else {
            files.set(entry.name, (await readFile(entryPath)).toString('hex'));
        }
    }
    return files;
}

describe('withCoderWorkspaceLock', () => {
    let temporaryDirectory: string;
    let repositoryRoot: string;
    let lockDirectory: string;
    let lockPath: string;

    /** Isolates Git identity and optional locks from the user's configuration. */
    async function git(...argumentsList: string[]): Promise<void> {
        await EXECUTE_FILE(
            'git',
            [
                '-c',
                'user.name=Lock Fixture',
                '-c',
                'user.email=lock@example.com',
                '-c',
                'commit.gpgsign=false',
                ...argumentsList,
            ],
            {
                cwd: repositoryRoot,
                env: {
                    ...process.env,
                    GIT_CONFIG_GLOBAL: join(temporaryDirectory, 'empty-git-config'),
                    GIT_CONFIG_NOSYSTEM: '1',
                    GIT_OPTIONAL_LOCKS: '0',
                },
            },
        );
    }

    beforeEach(async () => {
        temporaryDirectory = await realpath(await mkdtemp(join(tmpdir(), 'coder-workspace-lock-')));
        repositoryRoot = join(temporaryDirectory, 'checkout');
        lockDirectory = resolvePromptbookTemporaryPath(repositoryRoot, 'ptbk-coder');
        lockPath = join(lockDirectory, LOCK_FILENAME);
        await mkdir(repositoryRoot);
        await git('init', '--quiet', '--initial-branch=main');
        await git('commit', '--quiet', '--allow-empty', '-m', 'Fixture');
    });

    afterEach(async () => {
        await rm(temporaryDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    });

    it('creates and releases the ignored temporary lock without changing Git metadata or project ignore rules', async () => {
        const workspace = await $resolveWorkspaceRepository(repositoryRoot);
        const metadataBefore = await readDirectoryFiles(workspace.gitDirectory!);
        const result = await withCoderWorkspaceLock(workspace, async () => {
            expect(JSON.parse(await readFile(lockPath, 'utf-8'))).toEqual({
                token: expect.any(String),
                processId: process.pid,
                projectPath: repositoryRoot,
            });
            expect(await $runWorkspaceGit(repositoryRoot, ['status', '--porcelain'])).toBe('');
            expect(await listWorkingTreeChangedFiles(repositoryRoot)).toEqual([]);
            return 'completed';
        });
        expect(result).toBe('completed');
        await expect(readFile(lockPath)).rejects.toMatchObject({ code: 'ENOENT' });
        await expect(readFile(join(repositoryRoot, '.gitignore'))).rejects.toMatchObject({ code: 'ENOENT' });
        expect(await $runWorkspaceGit(repositoryRoot, ['status', '--porcelain'])).toBe('');
        expect(await readDirectoryFiles(workspace.gitDirectory!)).toEqual(metadataBefore);
    });

    it('shares one checkout lock across nested projects while allowing explicitly owned nesting', async () => {
        const firstProjectPath = join(repositoryRoot, 'apps', 'first');
        const secondProjectPath = join(repositoryRoot, 'apps', 'second');
        await mkdir(firstProjectPath, { recursive: true });
        await mkdir(secondProjectPath, { recursive: true });
        const competingOperation = jest.fn(async () => undefined);

        await withCoderWorkspaceLock(firstProjectPath, async () => {
            expect(JSON.parse(await readFile(lockPath, 'utf-8')).projectPath).toBe(firstProjectPath);
            await expect(withCoderWorkspaceLock(secondProjectPath, competingOperation)).rejects.toThrow(
                /Another Coder worker owns this workspace/u,
            );
            expect(competingOperation).not.toHaveBeenCalled();
            await expect(
                withCoderWorkspaceLock(secondProjectPath, async () => 'nested', { isNestedOwnershipAllowed: true }),
            ).resolves.toBe('nested');
        });
        await withCoderWorkspaceLock(secondProjectPath, competingOperation);
        expect(competingOperation).toHaveBeenCalledTimes(1);
        await expect(
            readFile(resolvePromptbookTemporaryPath(firstProjectPath, 'ptbk-coder', LOCK_FILENAME)),
        ).rejects.toMatchObject({
            code: 'ENOENT',
        });
    });

    it('gives linked worktrees independent temporary locks without changing either Git metadata location', async () => {
        const linkedWorktreePath = join(temporaryDirectory, 'linked checkout');
        await git('worktree', 'add', '--quiet', '--detach', linkedWorktreePath, 'HEAD');
        const workspace = await $resolveWorkspaceRepository(repositoryRoot);
        const linkedWorkspace = await $resolveWorkspaceRepository(linkedWorktreePath);
        const metadataBefore = await readDirectoryFiles(workspace.gitDirectory!);
        const linkedMetadataFileBefore = await readFile(join(linkedWorktreePath, '.git'), 'utf-8');
        const linkedLockPath = resolvePromptbookTemporaryPath(linkedWorktreePath, 'ptbk-coder', LOCK_FILENAME);

        await withCoderWorkspaceLock(workspace, async () => {
            await withCoderWorkspaceLock(linkedWorkspace, async () => {
                expect(JSON.parse(await readFile(lockPath, 'utf-8')).projectPath).toBe(repositoryRoot);
                expect(JSON.parse(await readFile(linkedLockPath, 'utf-8')).projectPath).toBe(linkedWorktreePath);
            });
            await expect(readFile(linkedLockPath)).rejects.toMatchObject({ code: 'ENOENT' });
        });
        expect(await readDirectoryFiles(workspace.gitDirectory!)).toEqual(metadataBefore);
        expect(await readFile(join(linkedWorktreePath, '.git'), 'utf-8')).toBe(linkedMetadataFileBefore);
    });

    it('releases ownership when the operation fails so the next worker can run', async () => {
        await expect(
            withCoderWorkspaceLock(repositoryRoot, async () => {
                throw new NotAllowed('Fixture operation failed');
            }),
        ).rejects.toThrow('Fixture operation failed');
        await expect(readFile(lockPath)).rejects.toMatchObject({ code: 'ENOENT' });
        await expect(withCoderWorkspaceLock(repositoryRoot, async () => 'retry')).resolves.toBe('retry');
    });

    it('retains a stale temporary lock and reports its owner before starting any operation', async () => {
        await mkdir(lockDirectory, { recursive: true });
        const owner = JSON.stringify({ token: 'previous-worker', processId: 123, projectPath: repositoryRoot });
        await writeFile(lockPath, owner);
        const operation = jest.fn(async () => undefined);

        await expect(withCoderWorkspaceLock(repositoryRoot, operation)).rejects.toThrow(lockPath);
        await expect(withCoderWorkspaceLock(repositoryRoot, operation)).rejects.toThrow(owner);
        expect(operation).not.toHaveBeenCalled();
        expect(await readFile(lockPath, 'utf-8')).toBe(owner);
    });

    it('leaves legacy workspace locks in Git metadata untouched', async () => {
        const legacyLockPath = join(repositoryRoot, '.git', LOCK_FILENAME);
        await writeFile(legacyLockPath, 'legacy owner');
        const metadataBefore = await readDirectoryFiles(join(repositoryRoot, '.git'));

        await expect(withCoderWorkspaceLock(repositoryRoot, async () => 'new location')).resolves.toBe('new location');
        expect(await readDirectoryFiles(join(repositoryRoot, '.git'))).toEqual(metadataBefore);
    });

    it('does not remove a replacement lock owned by another worker', async () => {
        const replacementOwner = JSON.stringify({ token: 'replacement-worker' });
        await withCoderWorkspaceLock(repositoryRoot, async () => {
            await writeFile(lockPath, replacementOwner);
        });
        expect(await readFile(lockPath, 'utf-8')).toBe(replacementOwner);
    });

    it('preserves existing local ignore rules and leaves other temporary files eligible', async () => {
        await mkdir(lockDirectory, { recursive: true });
        const localGitignorePath = join(lockDirectory, '.gitignore');
        await writeFile(localGitignorePath, 'existing.log\n');
        await withCoderWorkspaceLock(repositoryRoot, async () => {
            expect(await readFile(localGitignorePath, 'utf-8')).toContain('existing.log\n');
            await writeFile(join(lockDirectory, 'other.txt'), 'other content');
            expect(await listWorkingTreeChangedFiles(repositoryRoot)).toEqual(['.promptbook/ptbk-coder/other.txt']);
        });
    });

    it('preserves the direct-script bypass for directories without a Git repository', async () => {
        const projectPath = join(temporaryDirectory, 'plain project');
        await mkdir(projectPath);
        await expect(withCoderWorkspaceLock(projectPath, async () => 'no repository')).resolves.toBe('no repository');
        expect(await readdir(projectPath)).toEqual([]);
    });
});
