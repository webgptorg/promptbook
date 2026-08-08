/**
 * Pattern matching one `major.minor.patch` version anywhere in npm or CLI command output.
 */
const NPM_PACKAGE_VERSION_PATTERN = /\b(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)/gu;

/**
 * Extracts an npm package version from raw command output.
 *
 * Both npm and CLI commands may emit unrelated warnings before the version. CLI commands use the first matching token;
 * npm registry commands can opt into the last matching token because npm warnings commonly precede their JSON output.
 *
 * @returns The parsed version or `null` when the output contains no version
 * @private internal utility of `promptbookCli`
 */
export function extractNpmPackageVersionFromOutput(
    output: string,
    { isLastMatchPreferred = false }: { readonly isLastMatchPreferred?: boolean } = {},
): string | null {
    const versionMatches = Array.from(output.matchAll(NPM_PACKAGE_VERSION_PATTERN));
    const versionMatch = isLastMatchPreferred ? versionMatches[versionMatches.length - 1] : versionMatches[0];

    return versionMatch?.[1] ?? null;
}

// Note: [🟡] Code for CLI npm package version parsing [extractNpmPackageVersionFromOutput](src/cli/cli-commands/common/npm/extractNpmPackageVersionFromOutput.ts) should never be published outside of `@promptbook/cli`
