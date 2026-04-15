import colors from 'colors';
import fs, { readFile, writeFile } from 'fs/promises';
import { spaceTrim } from 'spacetrim';
import type { PackageJson } from 'type-fest';
import { isFileExisting } from '../../src/utils/files/isFileExisting';
import type { PackageMetadata } from './PackageMetadata';
import { logPackageGenerationStep } from './logPackageGenerationStep';

/**
 * Packages that are intentionally published without `@promptbook/core` as a peer dependency.
 *
 * @private internal utility of addDependenciesForGeneratedPackages
 */
const PACKAGE_FULLNAMES_WITHOUT_CORE_PEER_DEPENDENCY = new Set([
    '@promptbook/core',
    '@promptbook/utils',
    '@promptbook/cli',
    '@promptbook/markdown-utils',
]);

/**
 * Finalizes package manifests with dependencies and executable metadata.
 *
 * @param packagesMetadata - Metadata of generated packages
 * @param allDependencies - Dependency name-to-version map from the root manifest
 * @param mainPackageVersion - Shared Promptbook version
 * @private function of generatePackages
 */
export async function addDependenciesForGeneratedPackages(
    packagesMetadata: ReadonlyArray<PackageMetadata>,
    allDependencies: Record<string, string>,
    allDevelopmentDependencies: Record<string, string>,
    mainPackageVersion: string,
): Promise<void> {
    logPackageGenerationStep(`7️⃣  Add dependencies for each package`);

    for (const packageMetadata of packagesMetadata) {
        const packageJson = await readGeneratedPackageJson(packageMetadata.packageBasename);

        applyGeneratedPackageEntrypoints(packageJson, packageMetadata);
        applyGeneratedPackagePeerDependencies(packageJson, packageMetadata.packageFullname, mainPackageVersion);
        await applyDetectedBundleDependencies(packageJson, packageMetadata, allDependencies);
        applyAdditionalPackageDependencies(
            packageJson,
            packageMetadata.additionalDependencies,
            allDependencies,
            allDevelopmentDependencies,
            mainPackageVersion,
        );
        applyGeneratedPackageBin(packageJson, packageMetadata.packageFullname);
        removeReactRuntimeDependenciesFromComponents(packageJson, packageMetadata.packageFullname);

        await writeGeneratedPackageJson(packageMetadata.packageBasename, packageJson);
    }
}

/**
 * Reads a generated package manifest from disk.
 *
 * @param packageBasename - Basename of the generated package
 * @returns Parsed package manifest
 * @private internal utility of addDependenciesForGeneratedPackages
 */
async function readGeneratedPackageJson(packageBasename: string): Promise<PackageJson> {
    return JSON.parse(await readFile(`./packages/${packageBasename}/package.json`, 'utf-8')) as PackageJson;
}

/**
 * Writes a generated package manifest to disk using the repository formatting convention.
 *
 * @param packageBasename - Basename of the generated package
 * @param packageJson - Package manifest to write
 * @private internal utility of addDependenciesForGeneratedPackages
 */
async function writeGeneratedPackageJson(packageBasename: string, packageJson: PackageJson): Promise<void> {
    await writeFile(`./packages/${packageBasename}/package.json`, JSON.stringify(packageJson, null, 4) + '\n');
    // <- TODO: Add GENERATOR_WARNING to package.json
    // <- TODO: [0] package.json is is written twice, can it be done in one step?
}

/**
 * Adds `main`, `module`, and `typings` fields where the generated package layout requires them.
 *
 * @param packageJson - Generated package manifest
 * @param packageMetadata - Metadata of the generated package
 * @private internal utility of addDependenciesForGeneratedPackages
 */
function applyGeneratedPackageEntrypoints(packageJson: PackageJson, packageMetadata: PackageMetadata): void {
    const { isBuilded, packageBasename, packageFullname } = packageMetadata;

    if (!isBuilded || packageFullname === '@promptbook/cli') {
        return;
    }

    if (packageFullname !== '@promptbook/types') {
        packageJson.main = `./umd/index.umd.js`;
        packageJson.module = `./esm/index.es.js`;
    }

    packageJson.typings = `./esm/typings/src/_packages/${packageBasename}.index.d.ts`;
}

/**
 * Adds the peer dependency contract for one generated package.
 *
 * @param packageJson - Generated package manifest
 * @param packageFullname - Full package name
 * @param mainPackageVersion - Shared Promptbook version
 * @private internal utility of addDependenciesForGeneratedPackages
 */
function applyGeneratedPackagePeerDependencies(
    packageJson: PackageJson,
    packageFullname: string,
    mainPackageVersion: string,
): void {
    if (packageFullname === '@promptbook/components') {
        // React component library should rely on host app React versions
        packageJson.peerDependencies = {
            react: '>=17.0.0',
            'react-dom': '>=17.0.0',
        };

        // Ensure no hard dependency on React to avoid duplicate installs/bundles
        delete packageJson.dependencies;
        return;
    }

    if (PACKAGE_FULLNAMES_WITHOUT_CORE_PEER_DEPENDENCY.has(packageFullname)) {
        return;
    }

    packageJson.peerDependencies = {
        '@promptbook/core': mainPackageVersion,
    };
}

/**
 * Adds runtime dependencies discovered from the emitted ESM bundle.
 *
 * @param packageJson - Generated package manifest
 * @param packageMetadata - Metadata of the generated package
 * @param allDependencies - Dependency name-to-version map from the root manifest
 * @private internal utility of addDependenciesForGeneratedPackages
 */
async function applyDetectedBundleDependencies(
    packageJson: PackageJson,
    packageMetadata: PackageMetadata,
    allDependencies: Record<string, string>,
): Promise<void> {
    if (!packageMetadata.isBuilded) {
        return;
    }

    const detectedDependencies = await detectBundleDependencies(packageMetadata.packageBasename, allDependencies);

    for (const [dependencyName, dependencyVersion] of Object.entries(detectedDependencies)) {
        upsertPackageDependency(packageJson, dependencyName, dependencyVersion);
    }
}

/**
 * Detects runtime dependencies by scanning a generated ESM bundle.
 *
 * @param packageBasename - Basename of the generated package
 * @param allDependencies - Dependency name-to-version map from the root manifest
 * @returns Dependency name-to-version map referenced by the bundle
 * @private internal utility of addDependenciesForGeneratedPackages
 */
async function detectBundleDependencies(
    packageBasename: string,
    allDependencies: Record<string, string>,
): Promise<Record<string, string>> {
    const bundleName = `./packages/${packageBasename}/esm/index.es.js`;
    let indexContent = '';

    if (await isFileExisting(bundleName, fs)) {
        indexContent = await readFile(bundleName, 'utf-8');
    } else {
        console.warn(colors.yellow(`Bundle file ${bundleName} does not exist`));
    }

    const detectedDependencies: Record<string, string> = {};

    for (const [dependencyName, dependencyVersion] of Object.entries(allDependencies)) {
        if (bundleReferencesDependency(indexContent, dependencyName)) {
            detectedDependencies[dependencyName] = dependencyVersion;
        }
    }

    return detectedDependencies;
}

/**
 * Checks whether a generated bundle references a specific dependency.
 *
 * @param bundleContent - Generated bundle content
 * @param dependencyName - Dependency name to search for
 * @returns Whether the bundle references the dependency
 * @private internal utility of addDependenciesForGeneratedPackages
 */
function bundleReferencesDependency(bundleContent: string, dependencyName: string): boolean {
    return (
        bundleContent.includes(`from '${dependencyName}'`) ||
        bundleContent.includes(`require('${dependencyName}')`) ||
        bundleContent.includes(`require("${dependencyName}")`) ||
        bundleContent.includes(`import('${dependencyName}')`) ||
        bundleContent.includes(`import("${dependencyName}")`)
    );
}

/**
 * Adds explicitly declared package dependencies.
 *
 * @param packageJson - Generated package manifest
 * @param additionalDependencies - Additional package dependencies
 * @param allDependencies - Dependency versions from the root manifest `dependencies`
 * @param allDevelopmentDependencies - Dependency versions from the root manifest `devDependencies`
 * @param mainPackageVersion - Shared Promptbook version
 * @private internal utility of addDependenciesForGeneratedPackages
 */
function applyAdditionalPackageDependencies(
    packageJson: PackageJson,
    additionalDependencies: ReadonlyArray<string>,
    allDependencies: Record<string, string>,
    allDevelopmentDependencies: Record<string, string>,
    mainPackageVersion: string,
): void {
    for (const dependencyName of additionalDependencies) {
        upsertPackageDependency(
            packageJson,
            dependencyName,
            resolveAdditionalPackageDependencyVersion(
                dependencyName,
                allDependencies,
                allDevelopmentDependencies,
                mainPackageVersion,
            ),
        );
    }
}

/**
 * Resolves one explicitly declared generated-package dependency to the version that should be published.
 *
 * @param dependencyName - Dependency name
 * @param allDependencies - Dependency versions from the root manifest `dependencies`
 * @param allDevelopmentDependencies - Dependency versions from the root manifest `devDependencies`
 * @param mainPackageVersion - Shared Promptbook version
 * @returns Dependency version to publish
 * @private internal utility of addDependenciesForGeneratedPackages
 */
function resolveAdditionalPackageDependencyVersion(
    dependencyName: string,
    allDependencies: Record<string, string>,
    allDevelopmentDependencies: Record<string, string>,
    mainPackageVersion: string,
): string {
    if (dependencyName === 'promptbook' || dependencyName === 'ptbk' || dependencyName.startsWith('@promptbook/')) {
        return mainPackageVersion;
    }

    const dependencyVersion = allDependencies[dependencyName] || allDevelopmentDependencies[dependencyName];
    if (dependencyVersion === undefined) {
        throw new Error(
            spaceTrim(`
                Cannot resolve additional dependency \`${dependencyName}\` for a generated package.

                The dependency must exist in the root \`package.json\` under either \`dependencies\` or \`devDependencies\`.
            `),
        );
    }

    return dependencyVersion;
}

/**
 * Adds or updates one generated package dependency entry.
 *
 * @param packageJson - Generated package manifest
 * @param dependencyName - Dependency name
 * @param dependencyVersion - Dependency version
 * @private internal utility of addDependenciesForGeneratedPackages
 */
function upsertPackageDependency(packageJson: PackageJson, dependencyName: string, dependencyVersion: string): void {
    packageJson.dependencies = packageJson.dependencies || {};
    packageJson.dependencies[dependencyName] = dependencyVersion;
    // <- Note: [🧃] Using only `dependencies` (not `devDependencies`)
}

/**
 * Adds executable metadata to CLI-flavored generated packages.
 *
 * @param packageJson - Generated package manifest
 * @param packageFullname - Full package name
 * @private internal utility of addDependenciesForGeneratedPackages
 */
function applyGeneratedPackageBin(packageJson: PackageJson, packageFullname: string): void {
    if (packageFullname === '@promptbook/cli') {
        packageJson.bin = {
            promptbook: 'bin/promptbook-cli.js',
            ptbk: 'bin/promptbook-cli.js',
            book: 'bin/promptbook-cli.js',
            bk: 'bin/promptbook-cli.js',
            // <- TODO: [🧠] Pick one of and remove rest
        };
        return;
    }

    if (packageFullname === 'ptbk') {
        packageJson.bin = {
            ptbk: 'bin/promptbook-cli-proxy.js',
        };
    }
}

/**
 * Removes React runtime dependencies from the generated component package after inference.
 *
 * @param packageJson - Generated package manifest
 * @param packageFullname - Full package name
 * @private internal utility of addDependenciesForGeneratedPackages
 */
function removeReactRuntimeDependenciesFromComponents(packageJson: PackageJson, packageFullname: string): void {
    if (packageFullname !== '@promptbook/components' || packageJson.dependencies === undefined) {
        return;
    }

    delete packageJson.dependencies['react'];
    delete packageJson.dependencies['react-dom'];

    if (Object.keys(packageJson.dependencies).length === 0) {
        delete packageJson.dependencies;
    }
}

// Note: [⚫] Code for repository script [addDependenciesForGeneratedPackages](scripts/generate-packages/addDependenciesForGeneratedPackages.ts) should never be published in any package
