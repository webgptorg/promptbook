#!/usr/bin/env ts-node
// generate-packages.ts

import colors from 'colors';
import commander from 'commander';
import { cp, readFile, rm } from 'fs/promises';
import { basename, join } from 'path';
import { spaceTrim } from 'spacetrim';
import type { PackageJson } from 'type-fest';
import { assertsError } from '../../src/errors/assertsError';
import { $execCommand } from '../../src/utils/execCommand/$execCommand';
import { commit } from '../utils/autocommit/commit';
import { isWorkingTreeClean } from '../utils/autocommit/isWorkingTreeClean';
import { addDependenciesForGeneratedPackages } from './addDependenciesForGeneratedPackages';
import { assertGeneratedBundlesArePublishSafe } from './assertGeneratedBundlesArePublishSafe';
import { buildGeneratedPackageBundles } from './buildGeneratedPackageBundles';
import {
    collectMainPackageDependencies,
    collectMainPackageDevelopmentDependencies,
} from './collectMainPackageDependencies';
import { generatePackageEntryFiles } from './generatePackageEntryFiles';
import { generatePackageReadmesAndMetadata } from './generatePackageReadmesAndMetadata';
import type { PackageMetadata } from './PackageMetadata';
import { getPackagesMetadata } from './getPackagesMetadata';
import { logPackageGenerationStep } from './logPackageGenerationStep';
import { writePublishWorkflow } from './writePublishWorkflow';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(
        colors.red(
            spaceTrim(`
                CWD must be root of the project

                Script: generate-packages.ts
                Current CWD: ${process.cwd()}
                Expected CWD: ${join(__dirname, '../..')}
            `),
        ),
    );
    process.exit(1);
}

/**
 * Constant for program.
 */
const program = new commander.Command();
program.option('--commit', `Autocommit changes`, false);
program.option('--skip-bundler', `Skip the build process of bundler`, false);
program.parse(process.argv);

/**
 * Constant for { commit: is commited, skip bundler: is bundler skipped }.
 */
const { commit: isCommitted, skipBundler: isBundlerSkipped } = program.opts();

/**
 * Runtime options supported by the package-generation entrypoint.
 *
 * @private internal utility of package generation
 */
type GeneratePackagesOptions = {
    readonly isCommitted: boolean;
    readonly isBundlerSkipped: boolean;
};

/**
 * Shared data prepared once and reused across generation phases.
 *
 * @private internal utility of package generation
 */
type PackageGenerationContext = {
    readonly allDependencies: Record<string, string>;
    readonly allDevelopmentDependencies: Record<string, string>;
    readonly mainPackageJson: PackageJson;
    readonly mainPackageVersion: string;
    readonly packagesMetadata: ReadonlyArray<PackageMetadata>;
};

generatePackages({ isCommitted, isBundlerSkipped })
    .catch((error) => {
        assertsError(error);
        console.error(colors.bgRed(`${error.name} in ${basename(__filename)}`));
        console.error(colors.red(error.stack || error.message));
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

/**
 * Generates all package files and bundles used in the monorepo.
 *
 * @param options - Package generation options
 * @private internal utility of package generation
 */
async function generatePackages({ isCommitted, isBundlerSkipped }: GeneratePackagesOptions): Promise<void> {
    console.info(`📦  Generating packages`);

    await assertPackageGenerationWorkingTreeState(isCommitted);

    const packageGenerationContext = await preparePackageGenerationContext();

    await generatePackageEntryFiles(packageGenerationContext.packagesMetadata);
    await generatePackageReadmesAndMetadata(
        packageGenerationContext.packagesMetadata,
        packageGenerationContext.mainPackageJson,
    );
    await cleanupPackageBuildDirectories(packageGenerationContext.packagesMetadata, isBundlerSkipped);
    await buildGeneratedPackageBundles(packageGenerationContext.packagesMetadata, isBundlerSkipped);
    await postprocessGeneratedBundles(packageGenerationContext.packagesMetadata, isBundlerSkipped);
    await assertGeneratedBundlesArePublishSafe(packageGenerationContext.packagesMetadata, isBundlerSkipped);
    await addDependenciesForGeneratedPackages(
        packageGenerationContext.packagesMetadata,
        packageGenerationContext.allDependencies,
        packageGenerationContext.allDevelopmentDependencies,
        packageGenerationContext.mainPackageVersion,
    );
    await copyAgentsServerAppToCliPackage();
    await writePublishWorkflow(packageGenerationContext.packagesMetadata);
    await maybeCommitGeneratedPackages(isCommitted, packageGenerationContext.mainPackageVersion);
}

/**
 * Ensures `--commit` only runs against a clean repository state.
 *
 * @param isCommitted - Whether package generation should auto-commit the result
 * @private internal utility of package generation
 */
async function assertPackageGenerationWorkingTreeState(isCommitted: boolean): Promise<void> {
    if (isCommitted && !(await isWorkingTreeClean(process.cwd()))) {
        throw new Error(`Working tree is not clean`);
    }
}

/**
 * Loads package metadata and root package information shared across all later phases.
 *
 * @returns Prepared generation context
 * @private internal utility of package generation
 */
async function preparePackageGenerationContext(): Promise<PackageGenerationContext> {
    logPackageGenerationStep(`0️⃣  Prepare the needed information about the packages`);

    const mainPackageJson = JSON.parse(await readFile('./package.json', 'utf-8')) as PackageJson;

    console.info(`Promptbook version ${mainPackageJson.version}`);

    const mainPackageVersion = getRequiredMainPackageVersion(mainPackageJson);
    const allDependencies = collectMainPackageDependencies(mainPackageJson);
    const allDevelopmentDependencies = collectMainPackageDevelopmentDependencies(mainPackageJson);
    const packagesMetadata = await getPackagesMetadata();

    return {
        allDependencies,
        allDevelopmentDependencies,
        mainPackageJson,
        mainPackageVersion,
        packagesMetadata,
    };
}

/**
 * Verifies that the root package manifest contains a version string.
 *
 * @param mainPackageJson - Parsed root package manifest
 * @returns Required version string
 * @private internal utility of package generation
 */
function getRequiredMainPackageVersion(mainPackageJson: PackageJson): string {
    if (!mainPackageJson.version) {
        throw new Error(`Version is not defined in the package.json`);
    }

    return mainPackageJson.version;
}

/**
 * Removes old bundle directories before running Rollup again.
 *
 * @param packagesMetadata - Metadata of generated packages
 * @param isBundlerSkipped - Whether bundling is disabled for this run
 * @private internal utility of package generation
 */
async function cleanupPackageBuildDirectories(
    packagesMetadata: ReadonlyArray<PackageMetadata>,
    isBundlerSkipped: boolean,
): Promise<void> {
    logPackageGenerationStep(`3️⃣  Cleanup build directories for each package`);

    if (isBundlerSkipped) {
        console.info(colors.yellow(`Skipping the cleanup for bundler`));
        return;
    }

    for (const { isBuilded, packageBasename } of packagesMetadata) {
        if (!isBuilded) {
            continue;
        }

        await $execCommand(`rm -rf ./packages/${packageBasename}/umd`);
        await $execCommand(`rm -rf ./packages/${packageBasename}/esm`);
    }
}

/**
 * Performs the small cleanup pass applied after successful bundling.
 *
 * @param packagesMetadata - Metadata of generated packages
 * @param isBundlerSkipped - Whether bundling is disabled for this run
 * @private internal utility of package generation
 */
async function postprocessGeneratedBundles(
    packagesMetadata: ReadonlyArray<PackageMetadata>,
    isBundlerSkipped: boolean,
): Promise<void> {
    logPackageGenerationStep(`5️⃣  Postprocess the generated bundle`);

    if (isBundlerSkipped) {
        console.info(colors.yellow(`Skipping postprocessing`));
        return;
    }

    // Note: Keep `typings` only from `esm` (and remove `umd`)
    for (const { packageBasename } of packagesMetadata) {
        await $execCommand(`rm -rf ./packages/${packageBasename}/umd/typings`);
    }
}

/**
 * Copies the source layout needed to build the Agents Server app from the installed CLI package.
 *
 * @private internal utility of package generation
 */
async function copyAgentsServerAppToCliPackage(): Promise<void> {
    logPackageGenerationStep(`8️⃣  Copy agents-server app to CLI package`);

    const copyTargets = [
        {
            sourcePath: './apps/agents-server',
            destinationPath: './packages/cli/apps/agents-server',
        },
        {
            sourcePath: './apps/_common',
            destinationPath: './packages/cli/apps/_common',
        },
        {
            sourcePath: './src',
            destinationPath: './packages/cli/src',
        },
        {
            sourcePath: './servers.ts',
            destinationPath: './packages/cli/servers.ts',
        },
        {
            sourcePath: './security.config.ts',
            destinationPath: './packages/cli/security.config.ts',
        },
        {
            sourcePath: './books',
            destinationPath: './packages/cli/books',
        },
    ] as const;

    for (const { sourcePath, destinationPath } of copyTargets) {
        console.info(`Copying ${sourcePath} to ${destinationPath}`);

        await rm(destinationPath, { recursive: true, force: true });
        await cp(sourcePath, destinationPath, {
            recursive: true,
            filter: shouldCopyAgentsServerPackageSourcePath,
        });
    }

    console.info(colors.green('Agents-server app copied successfully'));
}

/**
 * Filters generated and machine-local directories out of the packaged Agents Server source copy.
 *
 * @param sourcePath - Original source path visited by `cp`.
 * @returns `true` when the path should be copied into the CLI package.
 * @private internal utility of package generation
 */
function shouldCopyAgentsServerPackageSourcePath(sourcePath: string): boolean {
    const normalizedSourcePath = sourcePath.replace(/\\/gu, '/');
    const sourceBasename = basename(normalizedSourcePath);
    const ignoredPathSegments = [
        '/.next',
        '/.next-e2e',
        '/.promptbook',
        '/coverage',
        '/node_modules',
    ];

    if (sourceBasename === '.env' || sourceBasename.startsWith('.env.')) {
        return false;
    }

    return !ignoredPathSegments.some(
        (ignoredPathSegment) =>
            normalizedSourcePath.endsWith(ignoredPathSegment) ||
            normalizedSourcePath.includes(`${ignoredPathSegment}/`),
    );
}

/**
 * Commits generated files when `--commit` is enabled.
 *
 * @param isCommitted - Whether package generation should auto-commit the result
 * @param mainPackageVersion - Shared Promptbook version
 * @private internal utility of package generation
 */
async function maybeCommitGeneratedPackages(isCommitted: boolean, mainPackageVersion: string): Promise<void> {
    if (!isCommitted) {
        return;
    }

    await commit(['src/_packages', 'packages', '.github'], `📦 Generating packages \`${mainPackageVersion}\``);
}

// Note: [⚫] Code for repository script [generate-packages](scripts/generate-packages/generate-packages.ts) should never be published in any package
// TODO: [👵] test before publish
// TODO: Add warning to the copy/generated files
// TODO: Use prettier to format the generated files
// TODO: Normalize order of keys in package.json
