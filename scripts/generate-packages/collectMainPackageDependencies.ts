import type { PackageJson } from 'type-fest';

/**
 * Collects runtime dependency versions that generated packages may inherit from the root manifest.
 *
 * @param mainPackageJson - Parsed root package manifest
 * @returns Dependency name-to-version map
 * @private internal utility of generatePackages
 */
export function collectMainPackageDependencies(mainPackageJson: PackageJson): Record<string, string> {
    const allDependencies: Record<string, string> = {};

    collectMainPackageDependenciesFromSection(allDependencies, mainPackageJson.dependencies);

    return allDependencies;
}

/**
 * Collects development dependency versions used for explicitly declared generated-package dependencies.
 *
 * @param mainPackageJson - Parsed root package manifest
 * @returns Development dependency name-to-version map
 * @private internal utility of generatePackages
 */
export function collectMainPackageDevelopmentDependencies(mainPackageJson: PackageJson): Record<string, string> {
    const allDevelopmentDependencies: Record<string, string> = {};

    collectMainPackageDependenciesFromSection(allDevelopmentDependencies, mainPackageJson.devDependencies);

    return allDevelopmentDependencies;
}

/**
 * Merges one dependency section into the combined package-generation version map.
 *
 * @param allDependencies - Mutable dependency name-to-version map
 * @param dependencyVersions - Dependency section to merge
 * @private internal utility of collectMainPackageDependencies
 */
function collectMainPackageDependenciesFromSection(
    allDependencies: Record<string, string>,
    dependencyVersions: PackageJson['dependencies'] | undefined,
): void {
    for (const [dependencyName, dependencyVersion] of Object.entries(dependencyVersions || {})) {
        if (dependencyVersion === undefined) {
            continue;
        }

        if (allDependencies[dependencyName] !== undefined) {
            continue;
        }

        allDependencies[dependencyName] = dependencyVersion;
    }
}

// Note: [⚫] Code for repository script [collectMainPackageDependencies](scripts/generate-packages/collectMainPackageDependencies.ts) should never be published in any package
