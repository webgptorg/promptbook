import { describe, expect, it, jest } from '@jest/globals';
import { execFile } from 'child_process';
import { Command as Program, CommanderError } from 'commander';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { PROMPTBOOK_ENGINE_VERSION } from '../../version';
import { $initializePromptbookCliProgram } from '../$initializePromptbookCliProgram';
import { $initializeAgentInitCommand } from '../cli-commands/agent-folder/init';
import { $initializeCoderInitCommand } from '../cli-commands/coder/init';

/**
 * Repository root used by the CLI subprocess tests even when an initialization test changes directories.
 */
const PTBK_TEST_WORKING_DIRECTORY = process.cwd();

/**
 * Executes one Promptbook CLI command from the repository root.
 *
 * @param commandArguments - Arguments passed to the CLI after the executable.
 * @returns The combined CLI output.
 */
function $executePtbkTestCommand(commandArguments: ReadonlyArray<string> = []): Promise<string> {
    return new Promise((resolve, reject) => {
        // Run the installed ts-node with this Node executable, without a shell or a global executable lookup.
        execFile(
            process.execPath,
            [require.resolve('ts-node/dist/bin.js'), '--transpile-only', 'src/cli/test/ptbk.ts', ...commandArguments],
            {
                cwd: PTBK_TEST_WORKING_DIRECTORY,
                windowsHide: true,
                // Stop a stuck child before Jest's five-minute timeout so it cannot leak into the next test.
                timeout: 120_000,
            },
            (error, stdout, stderr) => {
                if (error && (error.killed || error.signal || typeof error.code !== 'number')) {
                    reject(error);
                    return;
                }

                // Invalid-command tests intentionally inspect output from a nonzero exit.
                resolve(`${stdout}${stderr}`.trim());
            },
        );
    });
}

/**
 * Parses help arguments with the real CLI registration while keeping output and exits inside this test.
 * A fresh Commander program prevents parsed options from leaking between checks.
 */
function getPtbkHelp(commandArguments: ReadonlyArray<string> = ['--help']): string {
    const output: string[] = [];
    const program = new Program();
    program.configureOutput({ writeOut: (text) => output.push(text) });
    program.exitOverride();
    $initializePromptbookCliProgram(program);

    try {
        program.parse([...commandArguments], { from: 'user' });
    } catch (error) {
        if (
            !(error instanceof CommanderError) ||
            error.exitCode !== 0 ||
            !['commander.helpDisplayed', 'commander.help'].includes(error.code)
        ) {
            throw error;
        }
    }

    return output.join('').trim();
}

/**
 * Creates one temporary directory for CLI integration tests.
 */
async function createTemporaryDirectory(): Promise<string> {
    return mkdtemp(join(tmpdir(), 'promptbook-cli-'));
}

describe('how promptbookCli works', () => {
    it('should initiate without errors', () =>
        expect($executePtbkTestCommand(['--help'])).resolves.toBe(getPtbkHelp()));

    it('should not list legacy top-level commands which are deprecated in help', () => {
        const helpOutput = getPtbkHelp();

        expect(helpOutput).toContain('Usage: promptbook|ptbk [options] [command]');
        expect(helpOutput).toContain('coder [options]');
        expect(helpOutput).toContain('agents-server [options]');
        expect(helpOutput).not.toContain('Deprecated:');
        expect(helpOutput).not.toContain('run|execute');
        expect(helpOutput).not.toContain('make|compile');
        expect(helpOutput).not.toContain('list-models|models');
        expect(helpOutput).not.toContain('list-scrapers|scrapers');
        expect(helpOutput).not.toContain('start-agents-server|start');
        expect(helpOutput).not.toContain('start-pipelines-server');
    });

    it('should keep legacy top-level commands which are deprecated usable and documented in their own help', () => {
        const runHelpOutput = getPtbkHelp(['run', '--help']);
        const startAgentsServerHelpOutput = getPtbkHelp(['help', 'start-agents-server']);

        expect(runHelpOutput).toContain('Usage: promptbook run|execute');
        expect(runHelpOutput).toContain('Deprecated: This command is part of the old pipeline system.');
        expect(startAgentsServerHelpOutput).toContain('Deprecated: Use `ptbk agents-server start` instead.');
    });

    it('should ask for a subcommand and print the top-level help when started without arguments', async () => {
        const helpOutput = getPtbkHelp();
        const defaultOutput = await $executePtbkTestCommand();

        expect(defaultOutput).toContain('Please specify a subcommand.');
        expect(defaultOutput).toContain(helpOutput);
    });

    it('should list `coder` as the first top-level command', () => {
        const helpOutput = getPtbkHelp();
        const [, listedCommands] = helpOutput.split('Commands:');

        expect(listedCommands).toBeDefined();
        expect(listedCommands!.trimStart()).toMatch(/^coder\b/);
    });

    it('should not fall back to the deprecated `run` command for a stray argument', async () => {
        const strayArgumentOutput = await $executePtbkTestCommand(['./nonexistent-file.book']);

        expect(strayArgumentOutput).toContain(`unknown command './nonexistent-file.book'`);
        expect(strayArgumentOutput).not.toContain('`ptbk run` is deprecated');
    });

    it('should report version', () =>
        expect($executePtbkTestCommand(['about'])).resolves.toContain(PROMPTBOOK_ENGINE_VERSION));

    it('should print version for `--version`', () =>
        expect($executePtbkTestCommand(['--version'])).resolves.toBe(PROMPTBOOK_ENGINE_VERSION));

    it('should print version for `-v`', () =>
        expect($executePtbkTestCommand(['-v'])).resolves.toBe(PROMPTBOOK_ENGINE_VERSION));

    it('should expose `coder init` command', () =>
        expect(getPtbkHelp(['coder', 'init', '--help'])).toContain(
            'Initialize Promptbook coder configuration for current project',
        ));

    it('should expose `coder list` command', () =>
        expect(getPtbkHelp(['coder', 'list', '--help'])).toContain(
            'List ready coding prompts by priority without executing them',
        ));

    it('should expose `agent-folder run-agent` command', () =>
        expect(getPtbkHelp(['agent-folder', 'run-agent', '--help'])).toContain(
            'Watch one agent repository continuously and answer queued user questions',
        ));

    it('should expose `agent chat` command', () =>
        expect(getPtbkHelp(['agent', 'chat', '--help'])).toContain(
            'Run an interactive CLI chat with one Promptbook agent book',
        ));

    it('should expose `agent exec` command', () =>
        expect(getPtbkHelp(['agent', 'exec', '--help'])).toContain(
            'Run one non-interactive message with a Promptbook agent book and print the answer',
        ));

    it('should expose `agents-server start` command', () =>
        expect(getPtbkHelp(['agents-server', 'start', '--help'])).toContain(
            'Start the Agents Server web app and the local coding-agent message runners',
        ));

    it('should expose `agents-server dev` command', () =>
        expect(getPtbkHelp(['agents-server', 'dev', '--help'])).toContain(
            'Start the Agents Server web app in development mode with hot reloading and the local coding-agent message runners',
        ));

    it('should expose `agents-server build` command', () =>
        expect(getPtbkHelp(['agents-server', 'build', '--help'])).toContain(
            'Build the Agents Server Next app for later local startup',
        ));

    it('should expose `agents-server init` command', () =>
        expect(getPtbkHelp(['agents-server', 'init', '--help'])).toContain(
            'Initialize Promptbook Agents Server configuration for current project',
        ));

    it('should expose `coder initialize` alias', () =>
        expect(getPtbkHelp(['coder', 'initialize', '--help'])).toContain(
            'Initialize Promptbook coder configuration for current project',
        ));

    it('should print checked standalone bootstrap summary for `coder init`', async () => {
        const temporaryDirectory = await createTemporaryDirectory();
        const consoleInfoMock = jest.spyOn(console, 'info').mockImplementation(() => undefined);
        const processExitMock = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
        const originalWorkingDirectory = process.cwd();

        try {
            const program = new Program();
            process.chdir(temporaryDirectory);
            $initializeCoderInitCommand(program);
            await program.parseAsync(['node', 'test', 'init', '--no-questions']);

            const output = consoleInfoMock.mock.calls.flat().join('\n');

            expect(output).toContain('Promptbook coder configuration initialized.');
            expect(output).toContain('✔ prompts/: created');
            expect(output).toContain('✔ prompts/templates/common.md: created');
            expect(output).toContain('✔ agents/: created');
            expect(output).toContain('✔ agents/developer.book: created');
            expect(output).toContain('✔ AGENTS.md: created');
            expect(output).not.toContain('AGENT_CODING.md');
            expect(output).toContain('✔ package.json: created');
            expect(output).toContain('✔ .vscode/settings.json: created');
            expect(output).not.toContain('agents-server.md');
        } finally {
            process.chdir(originalWorkingDirectory);
            consoleInfoMock.mockRestore();
            processExitMock.mockRestore();
            await rm(temporaryDirectory, { recursive: true, force: true }).catch(() => undefined);
        }
    });

    it('should print checked standalone bootstrap summary for `agent-folder init`', async () => {
        const temporaryDirectory = await createTemporaryDirectory();
        const consoleInfoMock = jest.spyOn(console, 'info').mockImplementation(() => undefined);
        const processExitMock = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
        const originalWorkingDirectory = process.cwd();

        try {
            const program = new Program();
            process.chdir(temporaryDirectory);
            $initializeAgentInitCommand(program);
            await program.parseAsync(['node', 'test', 'init']);

            const output = consoleInfoMock.mock.calls.flat().join('\n');

            expect(output).toContain('Promptbook agent configuration initialized.');
            expect(output).toContain('✔ messages/: created');
            expect(output).toContain('✔ messages/queued/: created');
            expect(output).toContain('✔ messages/finished/: created');
            expect(output).toContain('✔ knowledge/: created');
            expect(output).toContain('✔ agent.book: created');
            expect(output).toContain('✔ docs/book-language-manual.md: created');
        } finally {
            process.chdir(originalWorkingDirectory);
            consoleInfoMock.mockRestore();
            processExitMock.mockRestore();
            await rm(temporaryDirectory, { recursive: true, force: true }).catch(() => undefined);
        }
    });

    // TODO: Test each command
});
