import type { PromptbookCliInstallation } from './PromptbookCliInstallation';

/**
 * Builds the npm command that updates one existing Promptbook CLI installation.
 *
 * @private internal utility of `promptbookCli`
 */
export function buildPromptbookCliInstallCommand(installation: PromptbookCliInstallation): string {
    const { npmPackageName, installationLocation } = installation;

    if (installationLocation === 'global') {
        return `npm install --global ${npmPackageName}@latest`;
    }

    if (installationLocation === 'local-development-dependency') {
        return `npm install --save-dev ${npmPackageName}@latest`;
    }

    return `npm install --save ${npmPackageName}@latest`;
}

// Note: [🟡] Code for Promptbook CLI installation command [buildPromptbookCliInstallCommand](src/cli/cli-commands/common/promptbook-cli/buildPromptbookCliInstallCommand.ts) should never be published outside of `@promptbook/cli`
