import { $execCommand } from '../../../../utils/execCommand/$execCommand';
import { extractNpmPackageVersionFromOutput } from './extractNpmPackageVersionFromOutput';

/**
 * Time limit for the whole `npm view` lookup of the newest published package version.
 */
const NPM_PACKAGE_LATEST_VERSION_COMMAND_TIMEOUT_MS = 60 * 1000;

/**
 * Time limit for one npm registry request, so an unreachable registry never blocks the command.
 */
const NPM_REGISTRY_FETCH_TIMEOUT_MS = 20 * 1000;

/**
 * Pattern matching npm's JSON-encoded package version result.
 */
const NPM_VIEW_JSON_VERSION_PATTERN = /"(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)"/u;

/**
 * Reads the newest version of one npm package.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it queries the npm registry
 *
 * @returns The newest published version or `null` when the registry could not be reached
 * @private internal utility of `promptbookCli`
 */
export async function $resolveLatestNpmPackageVersion(npmPackageName: string): Promise<string | null> {
    const output = await $execCommand({
        command: `npm view ${npmPackageName} version --json --loglevel=error --fetch-timeout=${NPM_REGISTRY_FETCH_TIMEOUT_MS} --fetch-retries=1`,
        crashOnError: true,
        timeout: NPM_PACKAGE_LATEST_VERSION_COMMAND_TIMEOUT_MS,
        isVerbose: false,
    }).catch(() => '');

    return extractLatestNpmPackageVersionFromNpmViewOutput(output);
}

/**
 * Extracts the version from npm's JSON result while tolerating warnings emitted before or after that result.
 *
 * @private internal utility of `$resolveLatestNpmPackageVersion`
 */
function extractLatestNpmPackageVersionFromNpmViewOutput(output: string): string | null {
    const jsonVersionMatch = NPM_VIEW_JSON_VERSION_PATTERN.exec(output);

    return jsonVersionMatch?.[1] ?? extractNpmPackageVersionFromOutput(output, { isLastMatchPreferred: true });
}

// Note: [🟡] Code for CLI npm package registry lookup [$resolveLatestNpmPackageVersion](src/cli/cli-commands/common/npm/$resolveLatestNpmPackageVersion.ts) should never be published outside of `@promptbook/cli`
