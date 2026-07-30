import type { HarnessDefinition } from './HarnessDefinition';

/**
 * Builds the shell command which installs or updates one CLI coding harness globally.
 *
 * The very same command is executed by `$installHarness` and printed as the manual fallback,
 * so the user always sees exactly what Promptbook would run.
 *
 * @private internal utility of `promptbookCli`
 */
export function buildHarnessInstallCommand(definition: HarnessDefinition): string {
    return `npm install -g ${definition.npmPackageName}@latest`;
}

// Note: [🟡] Code for CLI harness install command [buildHarnessInstallCommand](src/cli/cli-commands/common/harness/buildHarnessInstallCommand.ts) should never be published outside of `@promptbook/cli`
