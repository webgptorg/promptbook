import colors from 'colors';
import fs, { readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
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
 * CLI dependencies that must match the Agents Server app build toolchain from root dev dependencies.
 *
 * @private internal utility of addDependenciesForGeneratedPackages
 */
const CLI_AGENTS_SERVER_DEVELOPMENT_DEPENDENCY_NAMES = new Set(['react', 'react-dom']);

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
    logPackageGenerationStep(`6️⃣  Add dependencies for each package`);

    for (const packageMetadata of packagesMetadata) {
        const packageJson = await readGeneratedPackageJson(packageMetadata.packageBasename);

        applyGeneratedPackageEntrypoints(packageJson, packageMetadata);
        applyGeneratedPackagePeerDependencies(packageJson, packageMetadata.packageFullname, mainPackageVersion);
        await applyDetectedBundleDependencies(packageJson, packageMetadata, allDependencies);
        applyAdditionalPackageDependencies(
            packageJson,
            packageMetadata.packageFullname,
            packageMetadata.additionalDependencies,
            allDependencies,
            allDevelopmentDependencies,
            mainPackageVersion,
        );
        applyGeneratedPackageBin(packageJson, packageMetadata.packageFullname);
        removeReactRuntimeDependenciesFromComponents(packageJson, packageMetadata.packageFullname);

        await writeGeneratedPackageExecutableFiles(packageMetadata.packageBasename, packageMetadata.packageFullname);
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
 * Computes the published declaration entrypoint path for one generated package.
 *
 * Rollup emits declaration files into `esm/src/_packages/*.index.d.ts`, so package manifests need
 * to point TypeScript there rather than to the legacy non-existent `esm/typings` directory.
 *
 * @param packageBasename - Basename of the generated package
 * @returns Relative declaration entrypoint path stored in generated package manifests
 * @private internal utility of addDependenciesForGeneratedPackages
 */
export function getGeneratedPackageDeclarationEntrypoint(packageBasename: string): string {
    return `./esm/src/_packages/${packageBasename}.index.d.ts`;
}

/**
 * Adds `main`, `module`, `types`, and `typings` fields where the generated package layout requires them.
 *
 * @param packageJson - Generated package manifest
 * @param packageMetadata - Metadata of the generated package
 * @private internal utility of addDependenciesForGeneratedPackages
 */
export function applyGeneratedPackageEntrypoints(packageJson: PackageJson, packageMetadata: PackageMetadata): void {
    const { isBuilded, packageBasename, packageFullname } = packageMetadata;

    if (!isBuilded || packageFullname === '@promptbook/cli') {
        return;
    }

    if (packageFullname !== '@promptbook/types') {
        packageJson.main = `./umd/index.umd.js`;
        packageJson.module = `./esm/index.es.js`;
    }

    const declarationEntrypoint = getGeneratedPackageDeclarationEntrypoint(packageBasename);
    packageJson.types = declarationEntrypoint;
    packageJson.typings = declarationEntrypoint;
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
export function bundleReferencesDependency(bundleContent: string, dependencyName: string): boolean {
    return createDependencyReferenceNeedles(dependencyName).some((dependencyReferenceNeedle) =>
        bundleContent.includes(dependencyReferenceNeedle),
    );
}

/**
 * Creates string needles that match exact and subpath bundle references for one dependency.
 *
 * @param dependencyName - Dependency name
 * @returns Bundle substrings that indicate a runtime reference
 * @private internal utility of addDependenciesForGeneratedPackages
 */
function createDependencyReferenceNeedles(dependencyName: string): Array<string> {
    return [
        ...createDependencyReferenceNeedlesWithPrefix('import ', dependencyName),
        ...createDependencyReferenceNeedlesWithPrefix('from ', dependencyName),
        ...createDependencyReferenceNeedlesWithPrefix('require(', dependencyName),
        ...createDependencyReferenceNeedlesWithPrefix('import(', dependencyName),
    ];
}

/**
 * Creates bundle-reference needles for one prefix and dependency.
 *
 * Matching both exact imports and `dependency/subpath` imports keeps package detection aligned
 * with Node resolution for entries such as `react-dom/server` and `crypto-js/sha256`.
 *
 * @param prefix - Syntax prefix preceding the module specifier
 * @param dependencyName - Dependency name
 * @returns Candidate substrings to search for in generated bundles
 * @private internal utility of addDependenciesForGeneratedPackages
 */
function createDependencyReferenceNeedlesWithPrefix(prefix: string, dependencyName: string): Array<string> {
    return [
        `${prefix}'${dependencyName}'`,
        `${prefix}"${dependencyName}"`,
        `${prefix}'${dependencyName}/`,
        `${prefix}"${dependencyName}/`,
    ];
}

/**
 * Adds explicitly declared package dependencies.
 *
 * @param packageJson - Generated package manifest
 * @param packageFullname - Full package name receiving dependencies
 * @param additionalDependencies - Additional package dependencies
 * @param allDependencies - Dependency versions from the root manifest `dependencies`
 * @param allDevelopmentDependencies - Dependency versions from the root manifest `devDependencies`
 * @param mainPackageVersion - Shared Promptbook version
 * @private internal utility of addDependenciesForGeneratedPackages
 */
function applyAdditionalPackageDependencies(
    packageJson: PackageJson,
    packageFullname: string,
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
                {
                    isDevelopmentDependencyPreferred:
                        packageFullname === '@promptbook/cli' &&
                        CLI_AGENTS_SERVER_DEVELOPMENT_DEPENDENCY_NAMES.has(dependencyName),
                },
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
 * @param options - Additional dependency-version resolution preferences
 * @returns Dependency version to publish
 * @private internal utility of addDependenciesForGeneratedPackages
 */
function resolveAdditionalPackageDependencyVersion(
    dependencyName: string,
    allDependencies: Record<string, string>,
    allDevelopmentDependencies: Record<string, string>,
    mainPackageVersion: string,
    options: {
        readonly isDevelopmentDependencyPreferred?: boolean;
    } = {},
): string {
    if (dependencyName === 'promptbook' || dependencyName === 'ptbk' || dependencyName.startsWith('@promptbook/')) {
        return mainPackageVersion;
    }

    const dependencyVersion = options.isDevelopmentDependencyPreferred
        ? allDevelopmentDependencies[dependencyName] || allDependencies[dependencyName]
        : allDependencies[dependencyName] || allDevelopmentDependencies[dependencyName];
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
 * Returns generated executable files that should be published with one package.
 *
 * @param packageFullname - Full package name
 * @returns Relative file path to generated file content map
 * @private internal utility of addDependenciesForGeneratedPackages
 */
export function getGeneratedPackageExecutableFiles(packageFullname: string): Record<string, string> {
    if (packageFullname === 'ptbk') {
        return {
            'bin/promptbook-cli-proxy.js': createPtbkCliProxyFileContent(),
        };
    }

    return {};
}

/**
 * Writes generated executable files for one package.
 *
 * @param packageBasename - Basename of the generated package
 * @param packageFullname - Full package name
 * @private internal utility of addDependenciesForGeneratedPackages
 */
async function writeGeneratedPackageExecutableFiles(packageBasename: string, packageFullname: string): Promise<void> {
    const generatedPackageExecutableFiles = getGeneratedPackageExecutableFiles(packageFullname);

    for (const [relativeFilePath, content] of Object.entries(generatedPackageExecutableFiles)) {
        const filePath = join('./packages', packageBasename, relativeFilePath);

        await fs.mkdir(dirname(filePath), { recursive: true });
        await writeFile(filePath, content + '\n');
    }
}

/**
 * Creates the published `ptbk` proxy launcher that forwards to `@promptbook/cli`.
 *
 * The proxy resolves `@promptbook/cli` from the installed `promptbook` dependency so it works
 * whether npm hoists `@promptbook/cli` next to `promptbook` or nests it inside `promptbook/node_modules`.
 *
 * @returns JavaScript launcher content for `packages/ptbk/bin/promptbook-cli-proxy.js`
 * @private internal utility of addDependenciesForGeneratedPackages
 */
function createPtbkCliProxyFileContent(): string {
    return spaceTrim(`
        #!/usr/bin/env node
        //               <- TODO: [🎺] Ensure correct version of Node.js is used
        // promptbook-cli-proxy.js

        /**
         * Note: [🔺] Purpose of this file is to forward \`ptbk\` package launches to \`@promptbook/cli\`
         */

        const { dirname } = require('path');

        // Resolve through \`promptbook\` so the proxy works for both hoisted and nested installs.
        const promptbookPackageRoot = dirname(require.resolve('promptbook/package.json'));
        const promptbookCliEntrypoint = require.resolve('@promptbook/cli/bin/promptbook-cli.js', {
            paths: [promptbookPackageRoot, __dirname],
        });

        require(promptbookCliEntrypoint);
    `);
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
