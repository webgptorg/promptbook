import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';

/**
 * Commander option bag for opting out of automatic coding-harness update checks.
 *
 * @private internal utility of `promptbookCli`
 */
export type HarnessUpdateCliOptions = {
    readonly harnessUpdate: boolean;
};

/**
 * Normalized automatic coding-harness update-check option.
 *
 * @private internal utility of `promptbookCli`
 */
export type NormalizedHarnessUpdateCliOptions = {
    readonly isHarnessUpdateCheckEnabled: boolean;
};

/**
 * Registers the shared `--no-harness-update` option on a `ptbk coder` command that uses a coding harness.
 *
 * @private internal utility of `promptbookCli`
 */
export function addHarnessUpdateOption(command: Program): void {
    command.option('--no-harness-update', 'Skip checking whether the installed coding harnesses are up to date');
}

/**
 * Converts the Commander harness-update flag into the normalized harness-check option.
 *
 * @private internal utility of `promptbookCli`
 */
export function normalizeHarnessUpdateCliOptions(
    cliOptions: HarnessUpdateCliOptions,
): NormalizedHarnessUpdateCliOptions {
    return {
        isHarnessUpdateCheckEnabled: cliOptions.harnessUpdate,
    };
}

// Note: [🟡] Code for CLI harness update options [harnessUpdateCliOptions](src/cli/cli-commands/common/harnessUpdateCliOptions.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and exported helper names
