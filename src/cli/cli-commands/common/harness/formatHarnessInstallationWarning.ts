import { spaceTrim } from 'spacetrim';
import type { HarnessInstallationMethod } from './HarnessInstallationOrigin';
import type { HarnessInstallationStatus } from './HarnessInstallationStatus';

/**
 * Human-readable description of each way a harness can be installed.
 */
const HARNESS_INSTALLATION_METHOD_DESCRIPTIONS: Readonly<Record<HarnessInstallationMethod, string>> = {
    'npm-global': 'global npm installation',
    standalone: 'standalone installation',
    homebrew: 'Homebrew installation',
    unknown: 'unknown installation method',
};

/**
 * Formats the warning shown when a harness is missing or outdated.
 *
 * @private internal utility of `promptbookCli`
 */
export function formatHarnessInstallationWarning(status: HarnessInstallationStatus): string {
    const { definition, installedVersion, latestVersion, installationOrigin } = status;

    if (status.installationState === 'not-installed') {
        return spaceTrim(`
            **${definition.label}** is not installed globally.

            The \`${definition.commandName}\` command was not found, so the \`${definition.harnessName}\` harness cannot run.
        `);
    }

    const warningLines = [
        `**${definition.label}** is outdated.`,
        '',
        `Installed version: \`${installedVersion}\``,
        `Newest version: \`${latestVersion}\``,
    ];

    if (installationOrigin.commandPath !== null) {
        const installationMethodDescription =
            HARNESS_INSTALLATION_METHOD_DESCRIPTIONS[installationOrigin.installationMethod];

        warningLines.push(
            `Installed command: \`${installationOrigin.commandPath}\` *(${installationMethodDescription})*`,
        );
    }

    return spaceTrim(warningLines.join('\n'));
}

// Note: [🟡] Code for CLI harness installation warning [formatHarnessInstallationWarning](src/cli/cli-commands/common/harness/formatHarnessInstallationWarning.ts) should never be published outside of `@promptbook/cli`
