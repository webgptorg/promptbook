import { describe, expect, it, jest } from '@jest/globals';
import { Command as Program } from 'commander';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { $initializeAgentInitCommand } from '../cli-commands/agent-folder/init';
import { $initializeCoderInitCommand } from '../cli-commands/coder/init';
import { $execCommand } from '../../utils/execCommand/$execCommand';
import { PROMPTBOOK_ENGINE_VERSION } from '../../version';

/**
 * Command used by CLI integration tests without repeating project-wide type checking in every child process.
 */
const PTBK_TEST_COMMAND = 'ts-node --transpile-only src/cli/test/ptbk.ts';
const PTBK_TEST_WORKING_DIRECTORY = process.cwd();

/**
 * Executes one Promptbook CLI command from the repository root.
 *
 * @param commandArguments - Arguments passed to the CLI after the executable.
 * @returns The combined CLI output.
 */
function $executePtbkTestCommand(commandArguments = ''): Promise<string> {
    return $execCommand({
        command: commandArguments ? `${PTBK_TEST_COMMAND} ${commandArguments}` : PTBK_TEST_COMMAND,
        crashOnError: false,
        cwd: PTBK_TEST_WORKING_DIRECTORY,
    });
}

/**
 * Creates one temporary directory for CLI integration tests.
 */
async function createTemporaryDirectory(): Promise<string> {
    return mkdtemp(join(tmpdir(), 'promptbook-cli-'));
}

describe('how promptbookCli works', () => {
    it('should initiate without errors', () =>
        expect($executePtbkTestCommand('--help')).resolves.toContain('Usage: promptbook|ptbk [options] [command]'));

    it('should mark legacy top-level commands as deprecated in help', async () => {
        const helpOutput = await $executePtbkTestCommand('--help');

        expect(helpOutput).toContain('run|execute');
        expect(helpOutput).toContain('Deprecated: This command is part of the old pipeline system.');
        expect(helpOutput).toContain('list-models|models');
        expect(helpOutput).toContain('Deprecated: This command is part of the old system.');
        expect(helpOutput).toContain('start-agents-server|start');
        expect(helpOutput).toContain('Deprecated: Use `ptbk agents-server start` instead.');
    });

    it('should print the same top-level help when started without arguments', async () => {
        const [helpOutput, defaultOutput] = await Promise.all([
            $executePtbkTestCommand('--help'),
            $executePtbkTestCommand(),
        ]);

        expect(defaultOutput).toBe(helpOutput);
    });

    it('should report version', () =>
        expect($executePtbkTestCommand('about')).resolves.toContain(PROMPTBOOK_ENGINE_VERSION));

    it('should print version for `--version`', () =>
        expect($executePtbkTestCommand('--version')).resolves.toBe(PROMPTBOOK_ENGINE_VERSION));

    it('should print version for `-v`', () =>
        expect($executePtbkTestCommand('-v')).resolves.toBe(PROMPTBOOK_ENGINE_VERSION));

    it('should expose `coder init` command', () =>
        expect($executePtbkTestCommand('coder init --help')).resolves.toContain(
            'Initialize Promptbook coder configuration for current project',
        ));

    it('should expose `agent-folder run-agent` command', () =>
        expect($executePtbkTestCommand('agent-folder run-agent --help')).resolves.toContain(
            'Watch one agent repository continuously and answer queued user questions',
        ));

    it('should expose `agent chat` command', () =>
        expect($executePtbkTestCommand('agent chat --help')).resolves.toContain(
            'Run an interactive CLI chat with one Promptbook agent book',
        ));

    it('should expose `agent exec` command', () =>
        expect($executePtbkTestCommand('agent exec --help')).resolves.toContain(
            'Run one non-interactive message with a Promptbook agent book and print the answer',
        ));

    it('should expose `agents-server start` command', () =>
        expect($executePtbkTestCommand('agents-server start --help')).resolves.toContain(
            'Start the Agents Server web app and the local coding-agent message runners',
        ));

    it('should expose `agents-server dev` command', () =>
        expect($executePtbkTestCommand('agents-server dev --help')).resolves.toContain(
            'Start the Agents Server web app in development mode with hot reloading and the local coding-agent message runners',
        ));

    it('should expose `agents-server build` command', () =>
        expect($executePtbkTestCommand('agents-server build --help')).resolves.toContain(
            'Build the Agents Server Next app for later local startup',
        ));

    it('should expose `agents-server init` command', () =>
        expect($executePtbkTestCommand('agents-server init --help')).resolves.toContain(
            'Initialize Promptbook Agents Server configuration for current project',
        ));

    it('should expose `coder initialize` alias', () =>
        expect($executePtbkTestCommand('coder initialize --help')).resolves.toContain(
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
            await program.parseAsync(['node', 'test', 'init']);

            const output = consoleInfoMock.mock.calls.flat().join('\n');

            expect(output).toContain('Promptbook coder configuration initialized.');
            expect(output).toContain('✔ prompts/: created');
            expect(output).toContain('✔ prompts/templates/common.md: created');
            expect(output).toContain('✔ agents/: created');
            expect(output).toContain('✔ agents/developer.book: created');
            expect(output).toContain('✔ AGENTS.md: created');
            expect(output).toContain('✔ AGENT_CODING.md: created');
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
