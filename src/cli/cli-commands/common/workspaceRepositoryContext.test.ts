import { execFile, execFileSync } from 'child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import { $askForConfirmation } from './$askForConfirmation';
import { $preflightWorkspaceRepository } from './workspaceRepositoryContext';

// cspell:ignore gpgsign gitdir

jest.mock('./$askForConfirmation', () => ({ $askForConfirmation: jest.fn() }));

/** Runs Git in one disposable repository without using shell quoting or global configuration. */
function git(projectPath: string, ...arguments_: string[]): string {
    return execFileSync('git', arguments_, { cwd: projectPath, encoding: 'utf-8' }).trim();
}

/** Creates a locally identified commit needed to attach a linked worktree or a submodule. */
function commitEmpty(projectPath: string): void {
    git(projectPath, '-c', 'user.name=Promptbook Test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '--allow-empty', '-m', 'Base');
}

/** Sets the stdin TTY flag for a single test without changing the actual input stream. */
function setInputIsTty(isTty: boolean): () => void {
    const descriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
    Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: isTty });
    return () => {
        if (descriptor) Object.defineProperty(process.stdin, 'isTTY', descriptor);
        else Reflect.deleteProperty(process.stdin, 'isTTY');
    };
}

describe('$preflightWorkspaceRepository', () => {
    let temporaryRootPath: string;
    let consoleWarningSpy: jest.SpyInstance;
    let consoleInfoSpy: jest.SpyInstance;

    beforeEach(async () => {
        temporaryRootPath = await mkdtemp(join(tmpdir(), 'promptbook-repository-context-'));
        consoleWarningSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    });

    afterEach(async () => {
        consoleWarningSpy.mockRestore();
        consoleInfoSpy.mockRestore();
        jest.clearAllMocks();
        await rm(temporaryRootPath, { recursive: true, force: true });
    });

    it('accepts an unborn branch without creating a commit', async () => {
        git(temporaryRootPath, 'init');
        const context = await $preflightWorkspaceRepository({ projectPath: temporaryRootPath, policy: 'initialize' });

        expect(context).toEqual({
            projectPath: temporaryRootPath,
            gitRootPath: temporaryRootPath,
            repositoryStatus: 'existing',
        });
        expect(() => git(temporaryRootPath, 'rev-parse', '--verify', 'HEAD^0')).toThrow();
    });

    it('accepts a repository with existing history without changing its branch or index', async () => {
        git(temporaryRootPath, 'init');
        commitEmpty(temporaryRootPath);
        await writeFile(join(temporaryRootPath, 'staged-user.txt'), 'User content\n');
        git(temporaryRootPath, 'add', 'staged-user.txt');
        const initialBranch = git(temporaryRootPath, 'symbolic-ref', '--short', 'HEAD');
        const initialCommit = git(temporaryRootPath, 'rev-parse', 'HEAD');

        const context = await $preflightWorkspaceRepository({ projectPath: temporaryRootPath, policy: 'mutate' });

        expect(context).toMatchObject({ gitRootPath: temporaryRootPath, repositoryStatus: 'existing' });
        expect(git(temporaryRootPath, 'symbolic-ref', '--short', 'HEAD')).toBe(initialBranch);
        expect(git(temporaryRootPath, 'rev-parse', 'HEAD')).toBe(initialCommit);
        expect(git(temporaryRootPath, 'diff', '--cached', '--name-only')).toContain('staged-user.txt');
        expect($askForConfirmation).not.toHaveBeenCalled();
    });

    it('keeps a nested project distinct from the enclosing Git root', async () => {
        git(temporaryRootPath, 'init');
        const projectPath = join(temporaryRootPath, 'packages', 'application');
        await mkdir(projectPath, { recursive: true });

        const context = await $preflightWorkspaceRepository({ projectPath, policy: 'initialize' });

        expect(context).toMatchObject({ projectPath, gitRootPath: temporaryRootPath, repositoryStatus: 'existing' });
        await expect(readFile(join(projectPath, '.git'))).rejects.toMatchObject({ code: 'ENOENT' });
    });

    it('recognizes a linked worktree whose .git is a file', async () => {
        const mainPath = join(temporaryRootPath, 'main');
        const worktreePath = join(temporaryRootPath, 'linked');
        await mkdir(mainPath);
        git(mainPath, 'init');
        commitEmpty(mainPath);
        git(mainPath, 'worktree', 'add', '--detach', worktreePath);

        const context = await $preflightWorkspaceRepository({ projectPath: worktreePath, policy: 'mutate' });

        expect(context).toMatchObject({ gitRootPath: worktreePath, repositoryStatus: 'existing' });
        expect((await readFile(join(worktreePath, '.git'), 'utf-8')).trim()).toMatch(/^gitdir:/u);
        expect($askForConfirmation).not.toHaveBeenCalled();
    });

    it('recognizes a submodule without initializing Git inside it', async () => {
        const sourcePath = join(temporaryRootPath, 'source');
        const parentPath = join(temporaryRootPath, 'parent');
        await mkdir(sourcePath);
        await mkdir(parentPath);
        git(sourcePath, 'init');
        commitEmpty(sourcePath);
        git(parentPath, 'init');
        git(parentPath, '-c', 'protocol.file.allow=always', 'submodule', 'add', sourcePath, 'module');
        const projectPath = join(parentPath, 'module');

        const context = await $preflightWorkspaceRepository({ projectPath, policy: 'initialize' });

        expect(context).toMatchObject({ gitRootPath: projectPath, repositoryStatus: 'existing' });
        expect((await readFile(join(projectPath, '.git'), 'utf-8')).trim()).toMatch(/^gitdir:/u);
    });

    it('warns for a preview without writing Git metadata', async () => {
        const context = await $preflightWorkspaceRepository({ projectPath: temporaryRootPath, policy: 'preview' });

        expect(context).toEqual({ projectPath: temporaryRootPath, repositoryStatus: 'missing' });
        expect(consoleWarningSpy).toHaveBeenCalledWith(expect.stringContaining('ptbk init'));
        await expect(readFile(join(temporaryRootPath, '.git'))).rejects.toMatchObject({ code: 'ENOENT' });
    });

    it('requires an interactive answer for mutation even when questions were not explicitly disabled', async () => {
        const restoreTty = setInputIsTty(false);
        try {
            await expect($preflightWorkspaceRepository({ projectPath: temporaryRootPath, policy: 'mutate' })).rejects.toThrow('Git repository required');
            expect($askForConfirmation).not.toHaveBeenCalled();
        } finally {
            restoreTty();
        }
    });

    it('does not treat --no-questions as Git initialization consent', async () => {
        const restoreTty = setInputIsTty(true);
        try {
            await expect($preflightWorkspaceRepository({
                projectPath: temporaryRootPath,
                policy: 'mutate',
                questionsOptions: { isAskingQuestionsEnabled: false },
            })).rejects.toThrow('ptbk coder init');
            expect($askForConfirmation).not.toHaveBeenCalled();
        } finally {
            restoreTty();
        }
    });

    it('asks once and continues in the requested directory after an affirmative answer', async () => {
        const restoreTty = setInputIsTty(true);
        ($askForConfirmation as jest.MockedFunction<typeof $askForConfirmation>).mockResolvedValueOnce(true);
        try {
            const context = await $preflightWorkspaceRepository({ projectPath: temporaryRootPath, policy: 'mutate' });
            expect(context).toMatchObject({ gitRootPath: temporaryRootPath, repositoryStatus: 'initialized' });
            expect($askForConfirmation).toHaveBeenCalledTimes(1);
            expect(git(temporaryRootPath, 'rev-parse', '--is-inside-work-tree')).toBe('true');
        } finally {
            restoreTty();
        }
    });

    it('stops without project writes when the answer is declined or cancelled', async () => {
        const restoreTty = setInputIsTty(true);
        ($askForConfirmation as jest.MockedFunction<typeof $askForConfirmation>).mockResolvedValueOnce(false);
        try {
            await expect($preflightWorkspaceRepository({ projectPath: temporaryRootPath, policy: 'mutate' })).rejects.toThrow('declined or cancelled');
            await expect(readFile(join(temporaryRootPath, '.git'))).rejects.toMatchObject({ code: 'ENOENT' });
        } finally {
            restoreTty();
        }
    });

    it('automatically initializes and then reuses Git for explicit init, even without questions', async () => {
        const options = {
            projectPath: temporaryRootPath,
            policy: 'initialize' as const,
            questionsOptions: { isAskingQuestionsEnabled: false },
        };
        expect((await $preflightWorkspaceRepository(options)).repositoryStatus).toBe('initialized');
        expect((await $preflightWorkspaceRepository(options)).repositoryStatus).toBe('existing');
        expect($askForConfirmation).not.toHaveBeenCalled();
    });

    it('initializes only the requested child project when no ancestor is a repository', async () => {
        const projectPath = join(temporaryRootPath, 'nested-project');
        await mkdir(projectPath);

        const context = await $preflightWorkspaceRepository({ projectPath, policy: 'initialize' });

        expect(context).toMatchObject({ projectPath, gitRootPath: projectPath, repositoryStatus: 'initialized' });
        expect(git(projectPath, 'rev-parse', '--show-toplevel').replace(/\\/gu, '/')).toBe(projectPath.replace(/\\/gu, '/'));
        await expect(readFile(join(temporaryRootPath, '.git'))).rejects.toMatchObject({ code: 'ENOENT' });
    });

    it('rejects bare repositories without creating a nested repository', async () => {
        const barePath = join(temporaryRootPath, 'bare');
        git(temporaryRootPath, 'init', '--bare', barePath);
        await expect($preflightWorkspaceRepository({ projectPath: barePath, policy: 'initialize' })).rejects.toThrow('bare Git repository');
        await expect(readFile(join(barePath, '.git'))).rejects.toMatchObject({ code: 'ENOENT' });
    });

    it('distinguishes an unavailable Git executable from a missing repository', async () => {
        await expect($preflightWorkspaceRepository({
            projectPath: temporaryRootPath,
            policy: 'initialize',
            gitExecutable: join(temporaryRootPath, 'missing-git-executable'),
        })).rejects.toThrow('Git executable was not found');
    });

    it('rejects invalid Git metadata and never runs init over it', async () => {
        await writeFile(join(temporaryRootPath, '.git'), 'not a gitdir pointer\n');
        await expect($preflightWorkspaceRepository({ projectPath: temporaryRootPath, policy: 'initialize' })).rejects.toThrow('invalid or inaccessible');
        expect(await readFile(join(temporaryRootPath, '.git'), 'utf-8')).toBe('not a gitdir pointer\n');
    });

    it('reports ownership errors without modifying Git safety configuration', async () => {
        const runGitFile = jest.fn(async () => {
            throw Object.assign(new Error('dubious ownership'), { stderr: 'fatal: detected dubious ownership' });
        });
        await expect($preflightWorkspaceRepository({ projectPath: temporaryRootPath, policy: 'initialize', runGitFile })).rejects.toThrow('ownership');
        expect(runGitFile).toHaveBeenCalledTimes(1);
    });

    it('reports Git initialization permission failures and leaves project files alone', async () => {
        const executeRealGit = promisify(execFile);
        const runGitFile = jest.fn(async (executable: string, arguments_: ReadonlyArray<string>, options: { cwd: string; windowsHide: true }) => {
            if (arguments_[0] === 'init') {
                throw Object.assign(new Error('permission denied'), { code: 'EACCES', stderr: 'permission denied' });
            }
            return executeRealGit(executable, [...arguments_], options);
        });
        await expect($preflightWorkspaceRepository({ projectPath: temporaryRootPath, policy: 'initialize', runGitFile })).rejects.toThrow('Failed to initialize Git');
        expect(runGitFile).toHaveBeenCalledWith('git', ['init'], expect.objectContaining({ cwd: temporaryRootPath }));
        await expect(readFile(join(temporaryRootPath, '.git'))).rejects.toMatchObject({ code: 'ENOENT' });
    });
});
