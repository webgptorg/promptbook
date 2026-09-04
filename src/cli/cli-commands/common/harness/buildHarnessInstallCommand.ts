import { buildNpmPackageInstallCommand } from '../npm/buildNpmPackageInstallCommand';
import type { HarnessDefinition } from './HarnessDefinition';

/**
 * Builds the shell command which installs or updates one CLI coding harness globally.
 *
 * The very same command is executed by `$runHarnessInstallationCommand` and printed as the manual fallback,
 * so the user always sees exactly what Promptbook would run.
 *
 * Note: This command installs the harness through npm, so it may only update a harness which npm really owns,
 * see `resolveHarnessUpdatePlan`.
 *
 * @private internal utility of `promptbookCli`
 */
export function buildHarnessInstallCommand(definition: HarnessDefinition): string {
    return buildNpmPackageInstallCommand(definition.npmPackageName, 'global');
}

// Note: [🟡] Code for CLI harness install command [buildHarnessInstallCommand](src/cli/cli-commands/common/harness/buildHarnessInstallCommand.ts) should never be published outside of `@promptbook/cli`
