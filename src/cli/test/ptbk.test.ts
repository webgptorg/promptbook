import { describe, expect, it } from '@jest/globals';
import { $execCommand } from '../../utils/execCommand/$execCommand';
import { PROMPTBOOK_ENGINE_VERSION } from '../../version';

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

    // TODO: Test each command
});
