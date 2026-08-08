/**
 * Compares an installed npm package version with the newest published version.
 *
 * Only the numeric `major.minor.patch` segments are compared and pre-release suffixes are ignored,
 * so a package installed from a pre-release build of the newest version is not reported as outdated.
 *
 * @private internal utility of `promptbookCli`
 */
export function isNpmPackageVersionOutdated(installedVersion: string, latestVersion: string): boolean {
    const installedSegments = parseVersionSegments(installedVersion);
    const latestSegments = parseVersionSegments(latestVersion);
    const segmentCount = Math.max(installedSegments.length, latestSegments.length);

    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex++) {
        const installedSegment = installedSegments[segmentIndex] ?? 0;
        const latestSegment = latestSegments[segmentIndex] ?? 0;

        if (installedSegment !== latestSegment) {
            return installedSegment < latestSegment;
        }
    }

    return false;
}

/**
 * Splits one version into its numeric segments, dropping the pre-release and build suffix.
 *
 * @private internal utility of `isNpmPackageVersionOutdated`
 */
function parseVersionSegments(version: string): ReadonlyArray<number> {
    const [numericVersion = ''] = version.trim().split(/[-+]/u);

    return numericVersion.split('.').map((segment) => {
        const segmentNumber = Number.parseInt(segment, 10);

        return Number.isNaN(segmentNumber) ? 0 : segmentNumber;
    });
}

// Note: [🟡] Code for CLI npm package version comparison [isNpmPackageVersionOutdated](src/cli/cli-commands/common/npm/isNpmPackageVersionOutdated.ts) should never be published outside of `@promptbook/cli`
