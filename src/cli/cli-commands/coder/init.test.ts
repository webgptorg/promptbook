// cspell:ignore gpgsign
import { execFile } from 'child_process';
import { promisify } from 'util';
import { Command } from 'commander';
import { mkdtemp, mkdir, readFile, readdir, realpath, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { loadPromptFiles } from '../../../../scripts/run-codex-prompts/prompts/loadPromptFiles';
import { listRunnablePrompts } from '../../../../scripts/run-codex-prompts/prompts/listRunnablePrompts';
import { DEFAULT_BOILERPLATE_COUNT } from './boilerplateCount';
import { $ensureHarnessInstallations } from '../common/harness/$ensureHarnessInstallations';
import { $initializeCoderInitCommand } from './init';
import { PROMPTS_README_FILE_PATH, PROMPTS_README_TEMPLATE } from './promptsReadmeTemplate';

jest.mock('../common/harness/$ensureHarnessInstallations', () => ({
    $ensureHarnessInstallations: jest.fn(),
}));

/**
 * Typed Jest mock for the coder-init harness installation check.
 */
function getEnsureHarnessInstallationsMock(): jest.MockedFunction<typeof $ensureHarnessInstallations> {
    return $ensureHarnessInstallations as jest.MockedFunction<typeof $ensureHarnessInstallations>;
}

/**
 * Creates a temporary project directory for an initializer test.
 */
function createTemporaryProjectDirectory(): Promise<string> {
    return mkdtemp(join(tmpdir(), 'promptbook-coder-init-'));
}

/**
 * Runs the registered coder init command inside one temporary project.
 */
async function runCoderInitCommand(projectPath: string, args: ReadonlyArray<string> = []): Promise<void> {
    const originalWorkingDirectory = process.cwd();
    const program = new Command();

    try {
        process.chdir(projectPath);
        $initializeCoderInitCommand(program);
        await program.parseAsync(['node', 'test', 'init', ...args], { from: 'node' });
    } finally {
        process.chdir(originalWorkingDirectory);
    }
}

/**
 * Lists Markdown prompt files directly in the project's prompt queue.
 */
async function listPromptFileNames(projectPath: string): Promise<ReadonlyArray<string>> {
    const promptsDirectoryPath = join(projectPath, 'prompts');

    return (await loadPromptFiles(promptsDirectoryPath)).map(({ name }) => name).sort();
}

describe('$initializeCoderInitCommand', () => {
    let temporaryProjectDirectory: string;
    let processExitSpy: jest.SpyInstance<never, [code?: string | number | null | undefined]>;
    let consoleInfoSpy: jest.SpyInstance<void, [message?: unknown, ...optionalParams: unknown[]]>;

    beforeEach(async () => {
        temporaryProjectDirectory = await createTemporaryProjectDirectory();
        getEnsureHarnessInstallationsMock().mockResolvedValue(undefined);
        processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
        consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    });

    afterEach(async () => {
        processExitSpy.mockRestore();
        consoleInfoSpy.mockRestore();
        jest.clearAllMocks();
        await rm(temporaryProjectDirectory, { recursive: true, force: true });
    });

    it('generates boilerplate prompts for an empty prompt queue', async () => {
        await runCoderInitCommand(temporaryProjectDirectory);

        expect(await listPromptFileNames(temporaryProjectDirectory)).toHaveLength(DEFAULT_BOILERPLATE_COUNT.filesCount);
        expect(await readFile(join(temporaryProjectDirectory, PROMPTS_README_FILE_PATH), 'utf-8')).toBe(
            `${PROMPTS_README_TEMPLATE}\n`,
        );
        expect(consoleInfoSpy.mock.calls.flat().join('\n')).toContain('prompts/README.md: created');
        const prompts = await loadPromptFiles(join(temporaryProjectDirectory, 'prompts'));
        expect(prompts.every(({ sections }) => sections.every(({ status }) => status === 'not-ready'))).toBe(true);
        expect(listRunnablePrompts(prompts)).toEqual([]);
    });

    it('preserves a customized README and all prompt contents on repeated init', async () => {
        await runCoderInitCommand(temporaryProjectDirectory);
        const filenames = await listPromptFileNames(temporaryProjectDirectory);
        const contents = await Promise.all(
            filenames.map((filename) => readFile(join(temporaryProjectDirectory, 'prompts', filename), 'utf-8')),
        );
        const customReadme = '[ ] !!!\r\nOur own instructions, not a task.\r\n';
        await writeFile(join(temporaryProjectDirectory, PROMPTS_README_FILE_PATH), customReadme);
        consoleInfoSpy.mockClear();

        await runCoderInitCommand(temporaryProjectDirectory);

        expect(await readFile(join(temporaryProjectDirectory, PROMPTS_README_FILE_PATH), 'utf-8')).toBe(customReadme);
        expect(await listPromptFileNames(temporaryProjectDirectory)).toEqual(filenames);
        expect(
            await Promise.all(
                filenames.map((filename) => readFile(join(temporaryProjectDirectory, 'prompts', filename), 'utf-8')),
            ),
        ).toEqual(contents);
        expect(consoleInfoSpy.mock.calls.flat().join('\n')).toContain('prompts/README.md: unchanged');
    });

    it('restores a missing README when all project scripts and templates already exist', async () => {
        await runCoderInitCommand(temporaryProjectDirectory);
        const filenames = await listPromptFileNames(temporaryProjectDirectory);
        const packageJson = await readFile(join(temporaryProjectDirectory, 'package.json'), 'utf-8');
        await rm(join(temporaryProjectDirectory, PROMPTS_README_FILE_PATH));
        consoleInfoSpy.mockClear();

        await runCoderInitCommand(temporaryProjectDirectory);

        expect(await readFile(join(temporaryProjectDirectory, PROMPTS_README_FILE_PATH), 'utf-8')).toBe(
            `${PROMPTS_README_TEMPLATE}\n`,
        );
        expect(consoleInfoSpy.mock.calls.flat().join('\n')).toContain('prompts/README.md: created');
        expect(await listPromptFileNames(temporaryProjectDirectory)).toEqual(filenames);
        expect(await readFile(join(temporaryProjectDirectory, 'package.json'), 'utf-8')).toBe(packageJson);
    });

    it('creates a run script which follows the current Codex default instead of pinning a model', async () => {
        await runCoderInitCommand(temporaryProjectDirectory);

        const packageJson = JSON.parse(await readFile(join(temporaryProjectDirectory, 'package.json'), 'utf-8'));
        const runCommand = packageJson.scripts['coder:run'];

        expect(runCommand).toContain('npx ptbk coder run --harness openai-codex');
        expect(runCommand).not.toContain('--model');
    });

    it('generates boilerplate prompts for an existing empty prompt queue', async () => {
        await mkdir(join(temporaryProjectDirectory, 'prompts'), { recursive: true });

        await runCoderInitCommand(temporaryProjectDirectory);

        expect(await listPromptFileNames(temporaryProjectDirectory)).toHaveLength(DEFAULT_BOILERPLATE_COUNT.filesCount);
    });

    it('does not generate boilerplate prompts when the prompt queue is already non-empty', async () => {
        const promptsDirectoryPath = join(temporaryProjectDirectory, 'prompts');
        const existingPromptFileName = 'existing-prompt.md';

        await mkdir(promptsDirectoryPath, { recursive: true });
        await writeFile(join(promptsDirectoryPath, existingPromptFileName), '[ ]\n\nKeep this prompt.\n', 'utf-8');

        await runCoderInitCommand(temporaryProjectDirectory);

        expect(await listPromptFileNames(temporaryProjectDirectory)).toEqual([existingPromptFileName]);
        expect(await readFile(join(temporaryProjectDirectory, PROMPTS_README_FILE_PATH), 'utf-8')).toBe(
            `${PROMPTS_README_TEMPLATE}\n`,
        );
    });

    it('offers to install the checked coding harnesses in an interactive terminal', async () => {
        const descriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
        Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: true });
        try {
            await runCoderInitCommand(temporaryProjectDirectory);
        } finally {
            if (descriptor) Object.defineProperty(process.stdin, 'isTTY', descriptor);
            else delete (process.stdin as { isTTY?: boolean }).isTTY;
        }

        expect(getEnsureHarnessInstallationsMock()).toHaveBeenCalledWith(expect.anything(), {
            isAskingQuestionsEnabled: true,
        });
    });

    it('asks nothing about the checked coding harnesses when --no-questions is used', async () => {
        await runCoderInitCommand(temporaryProjectDirectory, ['--no-questions']);

        expect(getEnsureHarnessInstallationsMock()).toHaveBeenCalledWith(expect.anything(), {
            isAskingQuestionsEnabled: false,
        });
    });

    it('explains the complete default team and additive upgrades in init help', () => {
        const program = new Command();
        $initializeCoderInitCommand(program);
        const description = program.commands[0]!.description();
        expect(description).toContain('agents/lawyer.book');
        expect(description).toContain('agents/copywriter.book');
        expect(description).toContain('even when scripts already exist');
        expect(description).toContain('TEAM references');
        expect(program.commands.map((command) => command.name())).toEqual(['init']);
    });

    it('prints unresolved artifacts and exits unsuccessfully without replacing a conflicting Book', async () => {
        await mkdir(join(temporaryProjectDirectory, 'agents'), { recursive: true });
        await writeFile(join(temporaryProjectDirectory, 'agents/lawyer.book'), '');
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        try {
            await runCoderInitCommand(temporaryProjectDirectory, ['--no-questions']);
            expect(processExitSpy).toHaveBeenCalledWith(1);
            expect(consoleInfoSpy.mock.calls.flat().join('\n')).toContain('agents/lawyer.book: unresolved');
            expect(consoleErrorSpy.mock.calls.flat().join('\n')).toContain('TEAM');
            expect(await readFile(join(temporaryProjectDirectory, 'agents/lawyer.book'), 'utf-8')).toBe('');
            expect(getEnsureHarnessInstallationsMock()).not.toHaveBeenCalled();
        } finally {
            consoleErrorSpy.mockRestore();
        }
    });
    it('initializes Git without questions and reuses its metadata on repeated init', async () => {
        const executeFile = promisify(execFile);
        await writeFile(join(temporaryProjectDirectory, 'user-owned.txt'), 'Keep this file.');
        await runCoderInitCommand(temporaryProjectDirectory, ['--no-questions']);
        expect(
            (
                await executeFile('git', ['rev-parse', '--is-inside-work-tree'], { cwd: temporaryProjectDirectory })
            ).stdout.trim(),
        ).toBe('true');
        expect((await executeFile('git', ['ls-files'], { cwd: temporaryProjectDirectory })).stdout.trim()).toBe('');
        await expect(
            executeFile('git', ['rev-parse', '--verify', 'HEAD'], { cwd: temporaryProjectDirectory }),
        ).rejects.toThrow();
        await writeFile(join(temporaryProjectDirectory, '.git/hooks/user-hook'), 'Keep this hook.');
        await executeFile('git', ['add', 'user-owned.txt'], { cwd: temporaryProjectDirectory });
        const indexBefore = await readFile(join(temporaryProjectDirectory, '.git/index'));
        const configurationBefore = await readFile(join(temporaryProjectDirectory, '.git/config'));
        const headBefore = await readFile(join(temporaryProjectDirectory, '.git/HEAD'));
        consoleInfoSpy.mockClear();
        await runCoderInitCommand(temporaryProjectDirectory, ['--no-questions']);
        expect(await readFile(join(temporaryProjectDirectory, '.git/index'))).toEqual(indexBefore);
        expect(await readFile(join(temporaryProjectDirectory, '.git/config'))).toEqual(configurationBefore);
        expect(await readFile(join(temporaryProjectDirectory, '.git/HEAD'))).toEqual(headBefore);
        expect(await readFile(join(temporaryProjectDirectory, '.git/hooks/user-hook'), 'utf-8')).toBe(
            'Keep this hook.',
        );
        expect(consoleInfoSpy.mock.calls.flat().join('\n')).toContain('Git repository: reused');
        expect(await readFile(join(temporaryProjectDirectory, 'user-owned.txt'), 'utf-8')).toBe('Keep this file.');
    });

    it('creates project scaffolding in a nested project while reusing the parent repository', async () => {
        await promisify(execFile)('git', ['init'], { cwd: temporaryProjectDirectory });
        const projectPath = join(temporaryProjectDirectory, 'packages/child');
        await mkdir(projectPath, { recursive: true });
        await runCoderInitCommand(projectPath, ['--no-questions']);
        expect(await readdir(projectPath)).not.toContain('.git');
        expect(await readdir(temporaryProjectDirectory)).toEqual(['.git', 'packages']);
        expect(await readFile(join(projectPath, 'agents/developer.book'), 'utf-8')).toContain('Developer');
    });

    it('initializes Git before requested auto-pull and reports a missing remote without scaffolding', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        try {
            await runCoderInitCommand(temporaryProjectDirectory, ['--no-questions', '--auto-pull']);
            expect(processExitSpy).toHaveBeenCalledWith(1);
            const diagnostic = errorSpy.mock.calls.flat().join('\n');
            expect(diagnostic).toContain('no Git remote');
            expect(diagnostic).toContain('Completed setup steps');
            expect(diagnostic).toContain('Git repository initialized');
            expect(await readdir(temporaryProjectDirectory)).toEqual(['.git']);
            expect(getEnsureHarnessInstallationsMock()).not.toHaveBeenCalled();
        } finally {
            errorSpy.mockRestore();
        }
    });

    it.each(['unborn', 'committed', 'nested'])(
        'scopes explicit initialization commits and preserves unrelated user changes: %s',
        async (mode) => {
            const executeFile = promisify(execFile);
            const repositoryPath = await realpath(temporaryProjectDirectory);
            /** Runs fixture-only Git operations without global identity or signing configuration. */
            const git = async (...argumentsList: string[]) =>
                (await executeFile('git', argumentsList, { cwd: repositoryPath })).stdout.trim();
            await git('init');
            await git('config', 'user.name', 'Initialization Test');
            await git('config', 'user.email', 'initializer@example.com');
            await git('config', 'commit.gpgsign', 'false');
            await writeFile(join(repositoryPath, 'user-staged.txt'), 'Original staged work.');
            if (mode !== 'unborn') {
                await git('add', 'user-staged.txt');
                await git('commit', '-m', 'Fixture');
            }
            await writeFile(join(repositoryPath, 'user-staged.txt'), 'User staged revision.');
            await git('add', 'user-staged.txt');
            await writeFile(join(repositoryPath, 'user-staged.txt'), 'User unstaged revision.');
            await writeFile(join(repositoryPath, 'user-untracked.txt'), 'Unrelated untracked work.');
            const stagedBefore = await git('show', ':user-staged.txt');
            const projectPath = mode === 'nested' ? join(repositoryPath, 'packages/child') : repositoryPath;
            await mkdir(projectPath, { recursive: true });
            await runCoderInitCommand(projectPath, ['--no-questions', '--commit']);
            expect(processExitSpy).not.toHaveBeenCalledWith(1);
            const committedFiles = (
                await git('diff-tree', '--root', '--no-commit-id', '--name-only', '-r', 'HEAD')
            ).split('\n');
            const prefix = mode === 'nested' ? 'packages/child/' : '';
            expect(committedFiles).toContain(`${prefix}prompts/README.md`);
            expect(committedFiles).not.toContain('user-staged.txt');
            expect(committedFiles).not.toContain('user-untracked.txt');
            expect(await git('show', ':user-staged.txt')).toBe(stagedBefore);
            expect(await readFile(join(repositoryPath, 'user-staged.txt'), 'utf-8')).toBe('User unstaged revision.');
            expect(await readFile(join(repositoryPath, 'user-untracked.txt'), 'utf-8')).toBe(
                'Unrelated untracked work.',
            );
        },
    );
});
