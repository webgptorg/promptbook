import { Command } from 'commander';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'fs/promises';
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
