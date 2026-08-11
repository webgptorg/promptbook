/**
 * Parsed parts of one npm package version used for precedence comparison.
 *
 * @private internal utility of `isNpmPackageVersionOutdated`
 */
type ParsedNpmPackageVersion = {
    readonly releaseSegments: ReadonlyArray<number>;
    readonly prereleaseIdentifiers: ReadonlyArray<number | string> | null;
};

/**
 * Compares an installed npm package version with the newest published version.
 *
 * Release and prerelease identifiers follow semantic-version precedence while build metadata is ignored. Harnesses can
 * preserve their historical behavior by setting `isPrereleaseIgnored`, because some harness commands report a build
 * suffix which does not correspond to npm release precedence.
 *
 * @private internal utility of `promptbookCli`
 */
export function isNpmPackageVersionOutdated(
    installedVersion: string,
    latestVersion: string,
    { isPrereleaseIgnored = false }: { readonly isPrereleaseIgnored?: boolean } = {},
): boolean {
    const installedPackageVersion = parseNpmPackageVersion(installedVersion);
    const latestPackageVersion = parseNpmPackageVersion(latestVersion);
    const releaseComparison = compareNumericSegments(
        installedPackageVersion.releaseSegments,
        latestPackageVersion.releaseSegments,
    );

    if (releaseComparison !== 0) {
        return releaseComparison < 0;
    }

    if (isPrereleaseIgnored) {
        return false;
    }

    return (
        comparePrereleaseIdentifiers(
            installedPackageVersion.prereleaseIdentifiers,
            latestPackageVersion.prereleaseIdentifiers,
        ) < 0
    );
}

/**
 * Parses semantic-version release and prerelease parts, ignoring build metadata.
 */
function parseNpmPackageVersion(version: string): ParsedNpmPackageVersion {
    const buildMetadataSeparatorIndex = version.indexOf('+');
    const versionWithoutBuildMetadata = (
        buildMetadataSeparatorIndex === -1 ? version : version.slice(0, buildMetadataSeparatorIndex)
    ).trim();
    const prereleaseSeparatorIndex = versionWithoutBuildMetadata.indexOf('-');
    const releasePart =
        prereleaseSeparatorIndex === -1
            ? versionWithoutBuildMetadata
            : versionWithoutBuildMetadata.slice(0, prereleaseSeparatorIndex);
    const prereleasePart =
        prereleaseSeparatorIndex === -1 ? null : versionWithoutBuildMetadata.slice(prereleaseSeparatorIndex + 1);

    return {
        releaseSegments: releasePart.split('.').map(parseNumericVersionIdentifier),
        prereleaseIdentifiers:
            prereleasePart === null
                ? null
                : prereleasePart
                      .split('.')
                      .map((identifier) => (/^\d+$/u.test(identifier) ? Number.parseInt(identifier, 10) : identifier)),
    };
}

/**
 * Parses one numeric release identifier while retaining the former tolerant behavior for malformed input.
 */
function parseNumericVersionIdentifier(identifier: string): number {
    const identifierNumber = Number.parseInt(identifier, 10);

    return Number.isNaN(identifierNumber) ? 0 : identifierNumber;
}

/**
 * Compares numeric version segments, treating omitted trailing segments as zero.
 */
function compareNumericSegments(firstSegments: ReadonlyArray<number>, secondSegments: ReadonlyArray<number>): number {
    const segmentCount = Math.max(firstSegments.length, secondSegments.length);

    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex++) {
        const firstSegment = firstSegments[segmentIndex] ?? 0;
        const secondSegment = secondSegments[segmentIndex] ?? 0;

        if (firstSegment !== secondSegment) {
            return firstSegment < secondSegment ? -1 : 1;
        }
    }

    return 0;
}

/**
 * Compares semantic-version prerelease identifiers.
 */
function comparePrereleaseIdentifiers(
    firstIdentifiers: ReadonlyArray<number | string> | null,
    secondIdentifiers: ReadonlyArray<number | string> | null,
): number {
    if (firstIdentifiers === null || secondIdentifiers === null) {
        if (firstIdentifiers === secondIdentifiers) {
            return 0;
        }

        // Note: A version without prerelease identifiers has higher precedence than a prerelease
        return firstIdentifiers === null ? 1 : -1;
    }

    const identifierCount = Math.max(firstIdentifiers.length, secondIdentifiers.length);

    for (let identifierIndex = 0; identifierIndex < identifierCount; identifierIndex++) {
        const firstIdentifier = firstIdentifiers[identifierIndex];
        const secondIdentifier = secondIdentifiers[identifierIndex];

        if (firstIdentifier === undefined || secondIdentifier === undefined) {
            if (firstIdentifier === secondIdentifier) {
                return 0;
            }

            return firstIdentifier === undefined ? -1 : 1;
        }

        const identifierComparison = comparePrereleaseIdentifier(firstIdentifier, secondIdentifier);

        if (identifierComparison !== 0) {
            return identifierComparison;
        }
    }

    return 0;
}

/**
 * Compares two individual semantic-version prerelease identifiers.
 */
function comparePrereleaseIdentifier(firstIdentifier: number | string, secondIdentifier: number | string): number {
    if (firstIdentifier === secondIdentifier) {
        return 0;
    }

    if (typeof firstIdentifier === 'number' && typeof secondIdentifier === 'number') {
        return firstIdentifier < secondIdentifier ? -1 : 1;
    }

    if (typeof firstIdentifier === 'number') {
        return -1;
    }

    if (typeof secondIdentifier === 'number') {
        return 1;
    }

    return firstIdentifier < secondIdentifier ? -1 : 1;
}

// Note: [🟡] Code for CLI npm package version comparison [isNpmPackageVersionOutdated](src/cli/cli-commands/common/npm/isNpmPackageVersionOutdated.ts) should never be published outside of `@promptbook/cli`
