import type { HarnessDefinition } from './HarnessDefinition';
import type { HarnessInstallationMethod } from './HarnessInstallationOrigin';

/**
 * Directory which holds npm packages, so it appears in the resolved path of every globally installed npm binary
 * on systems where the global binary is only a symbolic link into the package.
 *
 * Note: Written in lower case because it is compared against normalized paths.
 */
const NODE_MODULES_DIRECTORY_NAME = 'node_modules';

/**
 * Directory into which Homebrew unpacks every formula, so it appears in the resolved path of
 * everything Homebrew manages and in nothing else.
 *
 * Note: Written in lower case because it is compared against normalized paths.
 */
const HOMEBREW_DIRECTORY_NAME = 'cellar';

/**
 * Options describing where the harness command was found.
 *
 * @private internal utility of `resolveHarnessInstallationMethodFromPaths`
 */
type HarnessInstallationPaths = {
    /**
     * Harness whose command was located.
     */
    readonly definition: HarnessDefinition;

    /**
     * Resolved path of the harness command with every symbolic link followed.
     */
    readonly commandPath: string;

    /**
     * Root directory of global npm installations or `null` when npm could not be asked for it.
     */
    readonly npmGlobalPrefixPath: string | null;
};

/**
 * Decides how a harness command was installed from the place where it really lives.
 *
 * Only a command which npm owns may be updated with `npm install -g`, every other command has to be
 * updated where it is installed, otherwise the update silently adds a second copy of the harness.
 *
 * @private internal utility of `promptbookCli`
 */
export function resolveHarnessInstallationMethodFromPaths(paths: HarnessInstallationPaths): HarnessInstallationMethod {
    const { definition, commandPath, npmGlobalPrefixPath } = paths;

    const normalizedCommandPath = normalizeInstallationPath(commandPath);
    const commandPathDirectoryNames = normalizedCommandPath.split('/');

    // Note: A Homebrew formula may bundle its own `node_modules` and may live under the npm prefix of a
    //       Homebrew-installed Node, so Homebrew has to be recognized before anything npm-shaped
    if (commandPathDirectoryNames.includes(HOMEBREW_DIRECTORY_NAME)) {
        return 'homebrew';
    }

    const standaloneDirectoryNames = definition.standaloneInstallation?.directoryNames ?? [];

    if (
        standaloneDirectoryNames.some((directoryName) =>
            commandPathDirectoryNames.includes(normalizeInstallationPath(directoryName)),
        )
    ) {
        return 'standalone';
    }

    // Note: npm is not always reachable, but its own package directory is a reliable fallback marker
    if (
        normalizedCommandPath.includes(
            `/${NODE_MODULES_DIRECTORY_NAME}/${normalizeInstallationPath(definition.npmPackageName)}/`,
        )
    ) {
        return 'npm-global';
    }

    if (isPathInsideDirectory(normalizedCommandPath, npmGlobalPrefixPath)) {
        return 'npm-global';
    }

    return 'unknown';
}

/**
 * Normalizes one path so that paths coming from different tools and platforms can be compared.
 *
 * Note: The comparison is case-insensitive because Windows paths are, and two harness paths which differ
 * only in letter casing do not exist in practice.
 */
function normalizeInstallationPath(path: string): string {
    return path.trim().replace(/\\/gu, '/').replace(/\/+$/u, '').toLowerCase();
}

/**
 * Checks whether one path lies inside a directory.
 */
function isPathInsideDirectory(normalizedPath: string, directoryPath: string | null): boolean {
    if (directoryPath === null) {
        return false;
    }

    const normalizedDirectoryPath = normalizeInstallationPath(directoryPath);

    return normalizedDirectoryPath !== '' && normalizedPath.startsWith(`${normalizedDirectoryPath}/`);
}

// Note: [🟡] Code for CLI harness installation method detection [resolveHarnessInstallationMethodFromPaths](src/cli/cli-commands/common/harness/resolveHarnessInstallationMethodFromPaths.ts) should never be published outside of `@promptbook/cli`
