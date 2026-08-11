import { buildNpmPackageInstallCommand } from '../npm/buildNpmPackageInstallCommand';
import type { PromptbookCliInstallation } from './PromptbookCliInstallation';

/**
 * Builds the npm command that updates one existing Promptbook CLI installation.
 *
 * @private internal utility of `promptbookCli`
 */
export function buildPromptbookCliInstallCommand(installation: PromptbookCliInstallation): string {
    return buildNpmPackageInstallCommand(installation.npmPackageName, installation.installationLocation);
}

// Note: [🟡] Code for Promptbook CLI installation command [buildPromptbookCliInstallCommand](src/cli/cli-commands/common/promptbook-cli/buildPromptbookCliInstallCommand.ts) should never be published outside of `@promptbook/cli`
