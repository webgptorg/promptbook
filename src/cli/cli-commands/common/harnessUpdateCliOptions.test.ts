import { Command } from 'commander';
import {
    addHarnessUpdateOption,
    normalizeHarnessUpdateCliOptions,
    type HarnessUpdateCliOptions,
} from './harnessUpdateCliOptions';

/**
 * Parses the shared harness-update flag exactly like a `ptbk coder` command does.
 */
function parseHarnessUpdateCliOptions(args: ReadonlyArray<string>): HarnessUpdateCliOptions {
    const command = new Command('run');
    command.exitOverride();
    addHarnessUpdateOption(command);
    command.parse([...args], { from: 'user' });
    return command.opts() as HarnessUpdateCliOptions;
}

describe('addHarnessUpdateOption', () => {
    it('checks harness updates by default', () => {
        expect(parseHarnessUpdateCliOptions([])).toEqual({ harnessUpdate: true });
    });

    it('disables harness update checks when --no-harness-update is used', () => {
        expect(parseHarnessUpdateCliOptions(['--no-harness-update'])).toEqual({ harnessUpdate: false });
    });
});

describe('normalizeHarnessUpdateCliOptions', () => {
    it('normalizes the disabled harness update check', () => {
        expect(normalizeHarnessUpdateCliOptions(parseHarnessUpdateCliOptions(['--no-harness-update']))).toEqual({
            isHarnessUpdateCheckEnabled: false,
        });
    });
});

// Note: [🟡] Code for CLI harness update option tests [harnessUpdateCliOptions.test](src/cli/cli-commands/common/harnessUpdateCliOptions.test.ts) should never be published outside of `@promptbook/cli`
