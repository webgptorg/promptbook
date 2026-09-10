import { Command } from 'commander';
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { DEFAULT_BOILERPLATE_COUNT } from './boilerplateCount';
import { $ensureHarnessInstallations } from '../common/harness/$ensureHarnessInstallations';
import { $initializeCoderInitCommand } from './init';

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
async function runCoderInitCommand(projectPath: string): Promise<void> {
    const originalWorkingDirectory = process.cwd();
    const program = new Command();

    try {
        process.chdir(projectPath);
        $initializeCoderInitCommand(program);
        await program.parseAsync(['node', 'test', 'init'], { from: 'node' });
    } finally {
        process.chdir(originalWorkingDirectory);
    }
}

/**
 * Lists Markdown prompt files directly in the project's prompt queue.
 */
async function listPromptFileNames(projectPath: string): Promise<ReadonlyArray<string>> {
    const promptsDirectoryPath = join(projectPath, 'prompts');

    return (await readdir(promptsDirectoryPath)).filter((fileName) => fileName.endsWith('.md')).sort();
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
    });
});
