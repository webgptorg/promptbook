import { Command } from 'commander';
import { execFileSync } from 'child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { loadPromptFiles } from '../../../../scripts/run-codex-prompts/prompts/loadPromptFiles';
import { listRunnablePrompts } from '../../../../scripts/run-codex-prompts/prompts/listRunnablePrompts';
import { DEFAULT_BOILERPLATE_COUNT } from './boilerplateCount';
import { $ensureHarnessInstallations } from '../common/harness/$ensureHarnessInstallations';
import { $initializeCoderInitCommand } from './init';
import { PROMPTS_README_FILE_PATH, PROMPTS_README_TEMPLATE } from './promptsReadmeTemplate';
import { $initializePromptbookCliProgram } from '../../$initializePromptbookCliProgram';

// cspell:ignore gpgsign

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

/** Runs one Git command inside a disposable project without changing global configuration. */
function git(projectPath: string, ...arguments_: string[]): string {
    return execFileSync('git', arguments_, { cwd: projectPath, encoding: 'utf-8' }).trim();
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

/** Runs the top-level registration of the same project initializer. */
async function runTopLevelInitCommand(projectPath: string, args: ReadonlyArray<string> = []): Promise<void> {
    const originalWorkingDirectory = process.cwd();
    const program = new Command();
    try {
        process.chdir(projectPath);
        $initializePromptbookCliProgram(program);
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

        expect(git(temporaryProjectDirectory, 'rev-parse', '--is-inside-work-tree')).toBe('true');

        expect(await listPromptFileNames(temporaryProjectDirectory)).toHaveLength(DEFAULT_BOILERPLATE_COUNT.filesCount);
        expect(await readFile(join(temporaryProjectDirectory, PROMPTS_README_FILE_PATH), 'utf-8')).toBe(
            `${PROMPTS_README_TEMPLATE}\n`,
        );
        expect(consoleInfoSpy.mock.calls.flat().join('\n')).toContain('prompts/README.md: created');
        const prompts = await loadPromptFiles(join(temporaryProjectDirectory, 'prompts'));
        expect(prompts.every(({ sections }) => sections.every(({ status }) => status === 'not-ready'))).toBe(true);
        expect(listRunnablePrompts(prompts)).toEqual([]);
    });

    it('registers top-level init through the same initializer and reuses Git on a second run', async () => {
        await runTopLevelInitCommand(temporaryProjectDirectory, ['--no-questions']);
        const packageJson = await readFile(join(temporaryProjectDirectory, 'package.json'), 'utf-8');
        expect(git(temporaryProjectDirectory, 'rev-parse', '--is-inside-work-tree')).toBe('true');
        consoleInfoSpy.mockClear();

        await runTopLevelInitCommand(temporaryProjectDirectory, ['--no-questions']);

        expect(consoleInfoSpy.mock.calls.flat().join('\n')).toContain('Git repository reused');
        expect(await readFile(join(temporaryProjectDirectory, 'package.json'), 'utf-8')).toBe(packageJson);
        expect(() => git(temporaryProjectDirectory, 'rev-parse', '--verify', 'HEAD')).toThrow();
    });

    it('scaffolds a nested project without creating a nested repository', async () => {
        git(temporaryProjectDirectory, 'init');
        const nestedProjectPath = join(temporaryProjectDirectory, 'packages', 'nested');
        await mkdir(nestedProjectPath, { recursive: true });

        await runCoderInitCommand(nestedProjectPath, ['--no-questions']);

        expect(git(nestedProjectPath, 'rev-parse', '--show-toplevel').replace(/\\/gu, '/')).toBe(
            temporaryProjectDirectory.replace(/\\/gu, '/'),
        );
        await expect(readFile(join(nestedProjectPath, '.git'))).rejects.toMatchObject({ code: 'ENOENT' });
        expect(await readFile(join(nestedProjectPath, PROMPTS_README_FILE_PATH), 'utf-8')).toBe(
            `${PROMPTS_README_TEMPLATE}\n`,
        );
        await expect(readFile(join(temporaryProjectDirectory, PROMPTS_README_FILE_PATH))).rejects.toMatchObject({
            code: 'ENOENT',
        });
    });

    it('commits only nested initialization artifacts from an unborn parent repository', async () => {
        git(temporaryProjectDirectory, 'init');
        git(temporaryProjectDirectory, 'config', '--local', 'user.name', 'Promptbook Test');
        git(temporaryProjectDirectory, 'config', '--local', 'user.email', 'test@example.invalid');
        git(temporaryProjectDirectory, 'config', '--local', 'commit.gpgsign', 'false');
        await writeFile(join(temporaryProjectDirectory, 'parent-user-file.txt'), 'User-owned content\n');
        git(temporaryProjectDirectory, 'add', 'parent-user-file.txt');
        const nestedProjectPath = join(temporaryProjectDirectory, 'packages', 'nested');
        await mkdir(nestedProjectPath, { recursive: true });

        await runCoderInitCommand(nestedProjectPath, ['--no-questions', '--commit']);

        expect(processExitSpy).toHaveBeenCalledWith(0);
        const committedPaths = git(temporaryProjectDirectory, 'show', '--name-only', '--format=', 'HEAD').split(/\r?\n/gu).filter(Boolean);
        expect(committedPaths.length).toBeGreaterThan(0);
        expect(committedPaths.every((path) => path.startsWith('packages/nested/'))).toBe(true);
        expect(git(temporaryProjectDirectory, 'diff', '--cached', '--name-only')).toContain('parent-user-file.txt');
    });

    it('creates Git before an explicitly requested pull and reports the stopped setup step', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        try {
            await runCoderInitCommand(temporaryProjectDirectory, ['--no-questions', '--auto-pull']);
            expect(processExitSpy).toHaveBeenCalledWith(1);
            expect(git(temporaryProjectDirectory, 'rev-parse', '--is-inside-work-tree')).toBe('true');
            expect(consoleErrorSpy.mock.calls.flat().join('\n')).toContain('no Git remote is configured');
            await expect(readFile(join(temporaryProjectDirectory, PROMPTS_README_FILE_PATH))).rejects.toMatchObject({
                code: 'ENOENT',
            });
        } finally {
            consoleErrorSpy.mockRestore();
        }
    });

    it('does not absorb staged or unstaged user changes into an explicit initialization commit', async () => {
        git(temporaryProjectDirectory, 'init');
        git(temporaryProjectDirectory, 'config', '--local', 'user.name', 'Promptbook Test');
        git(temporaryProjectDirectory, 'config', '--local', 'user.email', 'test@example.invalid');
        git(temporaryProjectDirectory, 'config', '--local', 'commit.gpgsign', 'false');
        await writeFile(join(temporaryProjectDirectory, 'user-owned.txt'), 'Original\n');
        git(temporaryProjectDirectory, 'add', 'user-owned.txt');
        git(temporaryProjectDirectory, 'commit', '-m', 'Base');
        await writeFile(join(temporaryProjectDirectory, 'user-owned.txt'), 'Unstaged user edit\n');
        await writeFile(join(temporaryProjectDirectory, 'staged-user.txt'), 'Staged user edit\n');
        git(temporaryProjectDirectory, 'add', 'staged-user.txt');

        await runCoderInitCommand(temporaryProjectDirectory, ['--no-questions', '--commit']);

        expect(processExitSpy).toHaveBeenCalledWith(0);
        expect(git(temporaryProjectDirectory, 'show', '--name-only', '--format=', 'HEAD')).not.toContain('user-owned.txt');
        expect(git(temporaryProjectDirectory, 'show', '--name-only', '--format=', 'HEAD')).not.toContain('staged-user.txt');
        expect(git(temporaryProjectDirectory, 'diff', '--cached', '--name-only')).toContain('staged-user.txt');
        expect(git(temporaryProjectDirectory, 'diff', '--name-only')).toContain('user-owned.txt');
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

    it('offers to install the checked coding harnesses by default', async () => {
        await runCoderInitCommand(temporaryProjectDirectory);

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
});
