import { describe, expect, it, jest } from '@jest/globals';
import { Command as Program } from 'commander';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
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
            await rm(temporaryDirectory, { recursive: true, force: true }).catch(() => undefined);
        }
    });

    // TODO: Test each command
});
