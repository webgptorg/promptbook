import { Command } from 'commander';
import { execFileSync } from 'child_process';
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { $initializePromptbookCliProgram } from '../../$initializePromptbookCliProgram';
import { runCodexPrompts } from '../../../../scripts/run-codex-prompts/main/runCodexPrompts';
import { runCodexPromptsServer } from '../../../../scripts/run-codex-prompts/main/runCodexPromptsServer';
import { $ensureHarnessInstallations } from '../common/harness/$ensureHarnessInstallations';
import { $askForConfirmation } from '../common/$askForConfirmation';
import { $initializeCoderCommand } from '../coder';

jest.mock('../../../../scripts/run-codex-prompts/main/runCodexPrompts', () => ({ runCodexPrompts: jest.fn() }));
jest.mock('../../../../scripts/run-codex-prompts/main/runCodexPromptsServer', () => ({ runCodexPromptsServer: jest.fn() }));
jest.mock('../common/harness/$ensureHarnessInstallations', () => ({ $ensureHarnessInstallations: jest.fn() }));
jest.mock('../common/$askForConfirmation', () => ({ $askForConfirmation: jest.fn() }));

/** Registers the real Coder action handlers without parsing a command during registration. */
function createCoderProgram(): Command {
    const program = new Command();
    $initializeCoderCommand(program);
    return program;
}

/** Temporarily makes the shared stdin stream appear interactive for one action test. */
function setInputIsTty(isTty: boolean): () => void {
    const descriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
    Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: isTty });
    return () => {
        if (descriptor) Object.defineProperty(process.stdin, 'isTTY', descriptor);
        else Reflect.deleteProperty(process.stdin, 'isTTY');
    };
}

describe('registered Coder workspace repository policy', () => {
    let projectPath: string;
    let originalWorkingDirectory: string;
    let processExitSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;
    let consoleWarningSpy: jest.SpyInstance;

    beforeEach(async () => {
        originalWorkingDirectory = process.cwd();
        projectPath = await mkdtemp(join(tmpdir(), 'promptbook-coder-no-git-'));
        await writeFile(join(projectPath, 'user-owned.txt'), 'Keep this file.\n');
        process.chdir(projectPath);
        processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        consoleWarningSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(async () => {
        process.chdir(originalWorkingDirectory);
        processExitSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        consoleWarningSpy.mockRestore();
        jest.clearAllMocks();
        await rm(projectPath, { recursive: true, force: true });
    });

    it.each([
        ['add', 'Add one feature'],
        ['add', '--no-questions'],
        ['generate-boilerplates', '--no-questions'],
        ['find-refactor-candidates', '--no-questions'],
        ['plan', '--harness', 'openai-codex', '--no-questions'],
        ['run', '--harness', 'openai-codex', '--no-commit', '--no-questions'],
        ['ping', '--harness', 'openai-codex', '--no-questions'],
        ['server', '--harness', 'openai-codex', '--no-commit', '--no-questions'],
        ['verify', '--no-questions'],
    ])('guards %s before any normal side effects', async (...arguments_: string[]) => {
        await createCoderProgram().parseAsync(['node', 'test', 'coder', ...arguments_], { from: 'node' });

        expect(processExitSpy).toHaveBeenCalledWith(1);
        expect(consoleErrorSpy.mock.calls.flat().join('\n')).toContain('Git repository required');
        expect(await readdir(projectPath)).toEqual(['user-owned.txt']);
        expect($ensureHarnessInstallations).not.toHaveBeenCalled();
        expect(runCodexPrompts).not.toHaveBeenCalled();
        expect(runCodexPromptsServer).not.toHaveBeenCalled();
    });

    it('guards a non-TTY run without --no-questions or --commit', async () => {
        const restoreTty = setInputIsTty(false);
        try {
            await createCoderProgram().parseAsync(['node', 'test', 'coder', 'run', '--harness', 'openai-codex', '--no-commit'], { from: 'node' });
            expect(processExitSpy).toHaveBeenCalledWith(1);
            expect($askForConfirmation).not.toHaveBeenCalled();
            expect(runCodexPrompts).not.toHaveBeenCalled();
            expect(await readdir(projectPath)).toEqual(['user-owned.txt']);
        } finally {
            restoreTty();
        }
    });

    it.each([
        ['plan', '--harness', 'openai-codex', '--no-questions'],
        ['verify', '--no-questions'],
    ])('keeps required %s decisions interactive in a repository', async (...arguments_: string[]) => {
        execFileSync('git', ['init'], { cwd: projectPath });

        await createCoderProgram().parseAsync(['node', 'test', 'coder', ...arguments_], { from: 'node' });

        expect(processExitSpy).toHaveBeenCalledWith(1);
        expect(consoleErrorSpy.mock.calls.flat().join('\n')).toContain('requires interactive decisions');
        expect(runCodexPrompts).not.toHaveBeenCalled();
        expect(runCodexPromptsServer).not.toHaveBeenCalled();
    });

    it('initializes Git once and resumes an interactive authoring action after approval', async () => {
        const restoreTty = setInputIsTty(true);
        ($askForConfirmation as jest.MockedFunction<typeof $askForConfirmation>).mockResolvedValueOnce(true);
        try {
            await createCoderProgram().parseAsync(['node', 'test', 'coder', 'add', 'Review this change'], { from: 'node' });
            expect($askForConfirmation).toHaveBeenCalledTimes(1);
            expect(processExitSpy).toHaveBeenCalledWith(0);
            expect(await readdir(projectPath)).toContain('.git');
            expect((await readdir(join(projectPath, 'prompts'))).some((name) => name.endsWith('.md'))).toBe(true);
        } finally {
            restoreTty();
        }
    });

    it('stops an interactive authoring action before project writes when approval is declined', async () => {
        const restoreTty = setInputIsTty(true);
        ($askForConfirmation as jest.MockedFunction<typeof $askForConfirmation>).mockResolvedValueOnce(false);
        try {
            await createCoderProgram().parseAsync(['node', 'test', 'coder', 'add', 'Review this change'], { from: 'node' });
            expect($askForConfirmation).toHaveBeenCalledTimes(1);
            expect(processExitSpy).toHaveBeenCalledWith(1);
            expect(await readdir(projectPath)).toEqual(['user-owned.txt']);
        } finally {
            restoreTty();
        }
    });

    it.each(['list', 'find-unwritten', 'find-fresh-emoji-tags'])('warns but keeps %s usable outside Git', async (action) => {
        await mkdir(join(projectPath, 'prompts'));
        await createCoderProgram().parseAsync(['node', 'test', 'coder', action], { from: 'node' });
        expect(consoleWarningSpy.mock.calls.flat().join('\n')).toContain('outside a Git repository');
        expect(processExitSpy).toHaveBeenCalledWith(0);
        expect(await readdir(projectPath)).toEqual(['prompts', 'user-owned.txt']);
    });

    it.each([
        ['run', '--dry-run', '--no-questions'],
        ['server', '--dry-run', '--no-questions'],
    ])('allows %s preview to continue without Git or setup', async (...arguments_: string[]) => {
        await createCoderProgram().parseAsync(['node', 'test', 'coder', ...arguments_], { from: 'node' });

        expect(consoleWarningSpy.mock.calls.flat().join('\n')).toContain('outside a Git repository');
        expect(processExitSpy).toHaveBeenCalledWith(0);
        expect(await readdir(projectPath)).toEqual(['user-owned.txt']);
        expect($ensureHarnessInstallations).not.toHaveBeenCalled();
    });

    it.each([
        ['--help'],
        ['--version'],
        ['coder', '--help'],
        ['coder', 'run', '--help'],
        ['init', '--help'],
        ['coder', 'run', '--unknown-option'],
    ])('keeps help, version and usage errors available without Git: %s', async (...arguments_: string[]) => {
        const program = new Command();
        program.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
        program.exitOverride();
        $initializePromptbookCliProgram(program);

        await expect(program.parseAsync(['node', 'test', ...arguments_], { from: 'node' })).rejects.toThrow();
        expect(await readdir(projectPath)).toEqual(['user-owned.txt']);
        expect($ensureHarnessInstallations).not.toHaveBeenCalled();
        expect(runCodexPrompts).not.toHaveBeenCalled();
    });
});
