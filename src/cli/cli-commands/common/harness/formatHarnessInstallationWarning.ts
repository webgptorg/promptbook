import { spaceTrim } from 'spacetrim';
import type { HarnessInstallationStatus } from './HarnessInstallationStatus';

/**
 * Formats the warning shown when a harness is missing or outdated.
 *
 * @private internal utility of `promptbookCli`
 */
export function formatHarnessInstallationWarning(status: HarnessInstallationStatus): string {
    const { definition, installedVersion, latestVersion } = status;

    if (status.installationState === 'not-installed') {
        return spaceTrim(`
            **${definition.label}** is not installed globally.

            The \`${definition.commandName}\` command was not found, so the \`${definition.harnessName}\` harness cannot run.
        `);
    }

    return spaceTrim(`
        **${definition.label}** is outdated.

        Installed version: \`${installedVersion}\`
        Newest version: \`${latestVersion}\`
    `);
}

// Note: [🟡] Code for CLI harness installation warning [formatHarnessInstallationWarning](src/cli/cli-commands/common/harness/formatHarnessInstallationWarning.ts) should never be published outside of `@promptbook/cli`
