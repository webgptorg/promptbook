import { spaceTrim } from 'spacetrim';
import type { PromptbookCliInstallationLocation } from './PromptbookCliInstallation';
import type { PromptbookCliInstallationStatus } from './PromptbookCliInstallationStatus';

/**
 * Formats the warning shown when one or more Promptbook CLI installations are outdated.
 *
 * @private internal utility of `promptbookCli`
 */
export function formatPromptbookCliInstallationWarning(
    statuses: ReadonlyArray<PromptbookCliInstallationStatus>,
): string {
    const statusLines = statuses.map((status) => {
        const { npmPackageName, installedVersion, installationLocation } = status.installation;

        return `- ${formatPromptbookCliInstallationLocation(
            installationLocation,
        )} \`${npmPackageName}\`: installed \`${installedVersion}\`, newest \`${status.latestVersion}\``;
    });

    return spaceTrim(
        (block) => `
            **Promptbook CLI** is outdated.

            ${block(statusLines.join('\n'))}
        `,
    );
}

/**
 * Describes an installation location in text suitable for an update warning.
 */
function formatPromptbookCliInstallationLocation(installationLocation: PromptbookCliInstallationLocation): string {
    if (installationLocation === 'global') {
        return 'Globally installed';
    }

    if (installationLocation === 'local-development-dependency') {
        return 'Locally in `devDependencies`';
    }

    return 'Locally in `dependencies`';
}

// Note: [🟡] Code for Promptbook CLI installation warning [formatPromptbookCliInstallationWarning](src/cli/cli-commands/common/promptbook-cli/formatPromptbookCliInstallationWarning.ts) should never be published outside of `@promptbook/cli`
