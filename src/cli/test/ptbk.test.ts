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
 * Creates one temporary directory for CLI integration tests.
 */
async function createTemporaryDirectory(): Promise<string> {
    return mkdtemp(join(tmpdir(), 'promptbook-cli-'));
}

describe('how promptbookCli works', () => {
    it('should initiate without errors', () =>
        expect(
            $execCommand({
                command: 'ts-node src/cli/test/ptbk.ts --help',
                crashOnError: false,
                cwd: process.cwd(),
            }),
        ).resolves.toContain('Usage: promptbook|ptbk [options] [command]'));

    it('should mark legacy top-level commands as deprecated in help', async () => {
        const helpOutput = await $execCommand({
            command: 'ts-node src/cli/test/ptbk.ts --help',
            crashOnError: false,
            cwd: process.cwd(),
        });

        expect(helpOutput).toContain('run|execute');
        expect(helpOutput).toContain('Deprecated: This command is part of the old pipeline system.');
        expect(helpOutput).toContain('list-models|models');
        expect(helpOutput).toContain('Deprecated: This command is part of the old system.');
        expect(helpOutput).toContain('start-agents-server|start');
        expect(helpOutput).toContain('Deprecated: Use `ptbk agents-server start` instead.');
    });

    it('should print the same top-level help when started without arguments', async () => {
        const [helpOutput, defaultOutput] = await Promise.all([
            $execCommand({
                command: 'ts-node src/cli/test/ptbk.ts --help',
                crashOnError: false,
                cwd: process.cwd(),
            }),
            $execCommand({
                command: 'ts-node src/cli/test/ptbk.ts',
                crashOnError: false,
                cwd: process.cwd(),
            }),
        ]);

        expect(defaultOutput).toBe(helpOutput);
    });

    it('should report version', () =>
        expect(
            $execCommand({
                command: 'ts-node src/cli/test/ptbk.ts about',
                crashOnError: false,
                cwd: process.cwd(),
            }),
        ).resolves.toContain(PROMPTBOOK_ENGINE_VERSION));

    it('should expose `coder init` command', () =>
        expect(
            $execCommand({
                command: 'ts-node src/cli/test/ptbk.ts coder init --help',
                crashOnError: false,
                cwd: process.cwd(),
            }),
        ).resolves.toContain('Initialize Promptbook coder configuration for current project'));

    it('should expose `agent-folder run-agent` command', () =>
        expect(
            $execCommand({
                command: 'ts-node src/cli/test/ptbk.ts agent-folder run-agent --help',
                crashOnError: false,
                cwd: process.cwd(),
            }),
        ).resolves.toContain('Watch one agent repository continuously and answer queued user questions'));

    it('should expose `agents-server start` command', () =>
        expect(
            $execCommand({
                command: 'ts-node src/cli/test/ptbk.ts agents-server start --help',
                crashOnError: false,
                cwd: process.cwd(),
            }),
        ).resolves.toContain('Start the Agents Server web app and the local coding-agent message runners'));

    it('should expose `agents-server build` command', () =>
        expect(
            $execCommand({
                command: 'ts-node src/cli/test/ptbk.ts agents-server build --help',
                crashOnError: false,
                cwd: process.cwd(),
            }),
        ).resolves.toContain('Build the Agents Server Next app for later local startup'));

    it('should expose `agents-server init` command', () =>
        expect(
            $execCommand({
                command: 'ts-node src/cli/test/ptbk.ts agents-server init --help',
                crashOnError: false,
                cwd: process.cwd(),
            }),
        ).resolves.toContain('Initialize Promptbook Agents Server configuration for current project'));

    it('should expose `coder initialize` alias', () =>
        expect(
            $execCommand({
                command: 'ts-node src/cli/test/ptbk.ts coder initialize --help',
                crashOnError: false,
                cwd: process.cwd(),
            }),
        ).resolves.toContain('Initialize Promptbook coder configuration for current project'));

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
