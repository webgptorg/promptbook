// cspell:ignore gpgsign NOSYSTEM gitdir gitfile
import { execFile } from 'child_process';
import { chmod, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import {
    captureCoderCommitScope,
    resolveCoderCommitScopePaths,
} from '../../../../scripts/run-codex-prompts/git/coderCommitScope';
import { loadPromptsModule } from '../../common/loadPromptsModule';
import { $preflightWorkspaceRepository, $resolveWorkspaceRepository } from './workspaceRepository';

jest.mock('../../common/loadPromptsModule', () => ({ loadPromptsModule: jest.fn() }));

/** Executes real local Git fixtures without a shell, network, or global configuration writes. */
const EXECUTE_FILE = promisify(execFile);

describe('workspace repository discovery and policy', () => {
    let temporaryDirectory: string;
    let projectPath: string;
    let originalEnvironment: NodeJS.ProcessEnv;
    let originalTerminalDescriptor: PropertyDescriptor | undefined;
    const prompt = jest.fn();

    /** Runs a local fixture Git operation with an identity only for this invocation. */
    async function git(directory: string, ...argumentsList: string[]): Promise<string> {
        const result = await EXECUTE_FILE(
            'git',
            [
                '-c',
                'user.name=Workspace Test',
                '-c',
                'user.email=workspace@example.com',
                '-c',
                'commit.gpgsign=false',
                ...argumentsList,
            ],
            { cwd: directory, env: process.env },
        );
        return result.stdout.trim();
    }

    /** Models terminal availability independently of how Jest was launched. */
    function setInteractive(isInteractive: boolean): void {
        Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: isInteractive });
    }

    beforeEach(async () => {
        temporaryDirectory = await realpath(await mkdtemp(join(tmpdir(), 'ptbk-workspace-git-')));
        projectPath = join(temporaryDirectory, 'project');
        await mkdir(projectPath);
        originalEnvironment = { ...process.env };
        process.env.GIT_CONFIG_GLOBAL = join(temporaryDirectory, 'empty-git-config');
        process.env.GIT_CONFIG_NOSYSTEM = '1';
        delete process.env.GIT_DIR;
        delete process.env.GIT_WORK_TREE;
        originalTerminalDescriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
        setInteractive(true);
        prompt.mockReset();
        (loadPromptsModule as jest.Mock).mockResolvedValue({ default: prompt });
        jest.spyOn(console, 'info').mockImplementation(() => undefined);
        jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(async () => {
        process.env = originalEnvironment;
        if (originalTerminalDescriptor) Object.defineProperty(process.stdin, 'isTTY', originalTerminalDescriptor);
        else delete (process.stdin as { isTTY?: boolean }).isTTY;
        jest.restoreAllMocks();
        await chmod(projectPath, 0o755).catch(() => undefined);
        await rm(temporaryDirectory, { recursive: true, force: true });
    });

    it('discovers normal and unborn repositories without requiring HEAD', async () => {
        await git(projectPath, 'init');
        expect(await $resolveWorkspaceRepository(projectPath)).toEqual({
            projectPath,
            repositoryRoot: projectPath,
            gitDirectory: join(projectPath, '.git'),
            repositoryStatus: 'reused',
        });
        await expect(git(projectPath, 'rev-parse', '--verify', 'HEAD')).rejects.toThrow();
        await git(projectPath, 'commit', '--allow-empty', '-m', 'Fixture');
        expect((await $resolveWorkspaceRepository(projectPath)).repositoryRoot).toBe(projectPath);
    });

    it('keeps a nested project distinct and never creates a nested repository', async () => {
        await git(temporaryDirectory, 'init');
        const workspace = await $preflightWorkspaceRepository({ projectDirectory: projectPath, policy: 'initialize' });
        expect(workspace.projectPath).toBe(projectPath);
        expect(workspace.repositoryRoot).toBe(temporaryDirectory);
        expect(workspace.repositoryStatus).toBe('reused');
        expect(await readdir(projectPath)).toEqual([]);
        expect(prompt).not.toHaveBeenCalled();
    });

    it('discovers a linked worktree with a .git file', async () => {
        await git(projectPath, 'init');
        await git(projectPath, 'commit', '--allow-empty', '-m', 'Fixture');
        const worktreePath = join(temporaryDirectory, 'linked');
        await git(projectPath, 'worktree', 'add', '-b', 'linked', worktreePath);
        expect(await readFile(join(worktreePath, '.git'), 'utf-8')).toContain('gitdir:');
        const workspace = await $preflightWorkspaceRepository({ projectDirectory: worktreePath, policy: 'initialize' });
        expect(workspace.repositoryRoot).toBe(worktreePath);
        expect(workspace.repositoryStatus).toBe('reused');
    });

    it('discovers the submodule root rather than its parent repository', async () => {
        const sourceDirectory = join(temporaryDirectory, 'source');
        await mkdir(sourceDirectory);
        await git(sourceDirectory, 'init');
        await git(sourceDirectory, 'commit', '--allow-empty', '-m', 'Fixture');
        await git(projectPath, 'init');
        await git(
            projectPath,
            '-c',
            'protocol.file.allow=always',
            'submodule',
            'add',
            sourceDirectory,
            'modules/child',
        );
        const submodulePath = join(projectPath, 'modules/child');
        expect(await readFile(join(submodulePath, '.git'), 'utf-8')).toContain('gitdir:');
        expect((await $resolveWorkspaceRepository(submodulePath)).repositoryRoot).toBe(submodulePath);
    });

    it('initializes only the resolved target after one affirmative answer', async () => {
        await writeFile(join(projectPath, 'existing.txt'), 'Keep this file.');
        prompt.mockResolvedValue({ isInitializingRepository: true });
        const workspace = await $preflightWorkspaceRepository({ projectDirectory: projectPath, policy: 'mutate' });
        expect(workspace.repositoryStatus).toBe('initialized');
        expect(workspace.repositoryRoot).toBe(projectPath);
        expect(prompt).toHaveBeenCalledTimes(1);
        expect(prompt.mock.calls[0][0].message).toContain(projectPath);
        expect(await readdir(temporaryDirectory)).toEqual(['project']);
        expect(await git(projectPath, 'ls-files')).toBe('');
        await expect(git(projectPath, 'rev-parse', '--verify', 'HEAD')).rejects.toThrow();
    });

    it.each([{ isInitializingRepository: false }, {}])('stops on decline or cancellation: %j', async (answer) => {
        prompt.mockResolvedValue(answer);
        await expect(
            $preflightWorkspaceRepository({ projectDirectory: projectPath, policy: 'mutate' }),
        ).rejects.toThrow('declined or cancelled');
        expect(await readdir(projectPath)).toEqual([]);
    });

    it.each(['no-questions', 'non-TTY'])('fails promptly without side effects for %s', async (mode) => {
        setInteractive(mode !== 'non-TTY');
        await expect(
            $preflightWorkspaceRepository({
                projectDirectory: projectPath,
                policy: 'mutate',
                isAskingQuestionsEnabled: mode !== 'no-questions',
            }),
        ).rejects.toThrow('ptbk init');
        expect(prompt).not.toHaveBeenCalled();
        expect(await readdir(projectPath)).toEqual([]);
    });

    it('keeps missing-repository previews useful without asking or creating files', async () => {
        const workspace = await $preflightWorkspaceRepository({ projectDirectory: projectPath, policy: 'read-only' });
        expect(workspace.repositoryStatus).toBe('missing');
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining(projectPath));
        expect(prompt).not.toHaveBeenCalled();
        expect(await readdir(projectPath)).toEqual([]);
    });

    it('treats explicit init as authorization even without questions or a terminal', async () => {
        setInteractive(false);
        const workspace = await $preflightWorkspaceRepository({
            projectDirectory: projectPath,
            policy: 'initialize',
            isAskingQuestionsEnabled: false,
        });
        expect(workspace.repositoryStatus).toBe('initialized');
        expect(prompt).not.toHaveBeenCalled();
        expect(
            (await $preflightWorkspaceRepository({ projectDirectory: projectPath, policy: 'initialize' }))
                .repositoryStatus,
        ).toBe('reused');
    });

    it('rechecks after confirmation to avoid creating a nested repository during a race', async () => {
        prompt.mockImplementation(async () => {
            await git(temporaryDirectory, 'init');
            return { isInitializingRepository: true };
        });
        const workspace = await $preflightWorkspaceRepository({ projectDirectory: projectPath, policy: 'mutate' });
        expect(workspace.repositoryRoot).toBe(temporaryDirectory);
        expect(await readdir(projectPath)).toEqual([]);
    });

    it('rejects a bare repository without initializing it', async () => {
        await git(projectPath, 'init', '--bare');
        await expect(
            $preflightWorkspaceRepository({ projectDirectory: projectPath, policy: 'initialize' }),
        ).rejects.toThrow('bare repository');
        expect(prompt).not.toHaveBeenCalled();
        expect(await readdir(projectPath)).not.toContain('.git');
    });

    it('distinguishes missing Git from missing repository', async () => {
        process.env.PATH = temporaryDirectory;
        await expect(
            $preflightWorkspaceRepository({ projectDirectory: projectPath, policy: 'initialize' }),
        ).rejects.toThrow('Git is not available');
        expect(prompt).not.toHaveBeenCalled();
        expect(await readdir(projectPath)).toEqual([]);
    });

    it.each(['directory', 'gitfile', 'index'])('rejects invalid Git metadata: %s', async (kind) => {
        if (kind === 'directory') await mkdir(join(projectPath, '.git'));
        else if (kind === 'gitfile') await writeFile(join(projectPath, '.git'), 'gitdir: missing-metadata\n');
        else {
            await git(projectPath, 'init');
            await writeFile(join(projectPath, '.git/index'), 'invalid index');
        }
        await expect(
            $preflightWorkspaceRepository({ projectDirectory: projectPath, policy: 'initialize' }),
        ).rejects.toThrow(/metadata|index/iu);
        expect(prompt).not.toHaveBeenCalled();
    });

    it('rejects damaged inner metadata even when Git discovers a valid parent repository', async () => {
        await git(temporaryDirectory, 'init');
        await mkdir(join(projectPath, '.git'));
        await expect(
            $preflightWorkspaceRepository({ projectDirectory: projectPath, policy: 'initialize' }),
        ).rejects.toThrow('metadata');
        expect(await readdir(join(projectPath, '.git'))).toEqual([]);
        expect(prompt).not.toHaveBeenCalled();
    });

    it('does not alter ownership trust or retry initialization on ownership errors', async () => {
        await git(projectPath, 'init');
        const configurationBefore = await readFile(join(projectPath, '.git/config'));
        process.env.GIT_TEST_ASSUME_DIFFERENT_OWNER = '1';
        await expect(
            $preflightWorkspaceRepository({ projectDirectory: projectPath, policy: 'initialize' }),
        ).rejects.toThrow('ownership');
        expect(await readFile(join(projectPath, '.git/config'))).toEqual(configurationBefore);
        expect(prompt).not.toHaveBeenCalled();
    });

    // This executable fixture needs POSIX shebang dispatch; Windows access failures are mocked in projectCliOptions.test.ts.
    (process.platform === 'win32' ? it.skip : it)(
        'reports initialization permission failures before project setup',
        async () => {
            // A failing executable fixture makes the permission failure deterministic without changing host ownership.
            const gitPath = (await EXECUTE_FILE('which', ['git'])).stdout.trim();
            const executableDirectory = join(temporaryDirectory, 'executables');
            await mkdir(executableDirectory);
            await writeFile(
                join(executableDirectory, 'git'),
                `#!${
                    process.execPath
                }\nif (process.argv[2] === 'init') { process.stderr.write('fatal: cannot mkdir .git: Permission denied\\n'); process.exit(128); }\nconst result = require('child_process').spawnSync(${JSON.stringify(
                    gitPath,
                )}, process.argv.slice(2), { encoding: 'utf-8' });\nprocess.stdout.write(result.stdout || ''); process.stderr.write(result.stderr || ''); process.exit(result.status || 0);\n`,
            );
            await chmod(join(executableDirectory, 'git'), 0o755);
            process.env.PATH = `${executableDirectory}:${originalEnvironment.PATH}`;
            await expect(
                $preflightWorkspaceRepository({ projectDirectory: projectPath, policy: 'initialize' }),
            ).rejects.toThrow('Permission denied');
            expect(await readdir(projectPath)).toEqual([]);
            expect(prompt).not.toHaveBeenCalled();
        },
    );

    it('captures an unborn repository scope without absorbing pre-existing files', async () => {
        await git(projectPath, 'init');
        await writeFile(join(projectPath, 'user.txt'), 'Existing user work.');
        await git(projectPath, 'add', 'user.txt');
        const scope = await captureCoderCommitScope(await $resolveWorkspaceRepository(projectPath));
        await writeFile(join(projectPath, 'generated.txt'), 'Generated by this operation.');
        expect(await resolveCoderCommitScopePaths(scope)).toEqual(['generated.txt']);
        expect(await git(projectPath, 'diff', '--cached', '--name-only')).toBe('user.txt');
    });
});

// Note: [💞] Ignore a discrepancy between file name and entity name
