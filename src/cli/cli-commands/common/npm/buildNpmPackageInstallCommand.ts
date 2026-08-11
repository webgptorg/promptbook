/**
 * Place where an npm package should be installed or updated.
 *
 * @private internal utility of `promptbookCli`
 */
export type NpmPackageInstallationLocation = 'local-dependency' | 'local-development-dependency' | 'global';

/**
 * Builds an npm command which installs or updates a package in the requested existing location.
 *
 * @private internal utility of `promptbookCli`
 */
export function buildNpmPackageInstallCommand(
    npmPackageName: string,
    installationLocation: NpmPackageInstallationLocation,
): string {
    if (installationLocation === 'global') {
        return `npm install -g ${npmPackageName}@latest`;
    }

    if (installationLocation === 'local-development-dependency') {
        return `npm install --save-dev ${npmPackageName}@latest`;
    }

    return `npm install --save ${npmPackageName}@latest`;
}

// Note: [🟡] Code for CLI npm install commands [buildNpmPackageInstallCommand](src/cli/cli-commands/common/npm/buildNpmPackageInstallCommand.ts) should never be published outside of `@promptbook/cli`
