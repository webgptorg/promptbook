#!/usr/bin/env ts-node
// use-packages.ts

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import colors from 'colors';
import commander from 'commander';
import fs, { readFile, writeFile } from 'fs/promises';
import { basename, join } from 'path';
import { spaceTrim } from 'spacetrim';
import type { PackageJson } from 'type-fest';
import { forTime } from 'waitasecond';
import { LOOP_LIMIT } from '../../src/config';
import { assertsError } from '../../src/errors/assertsError';
import { string_version_dependency } from '../../src/types/typeAliases';
import { $execCommand } from '../../src/utils/execCommand/$execCommand';
import { isFileExisting } from '../../src/utils/files/isFileExisting';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(
        colors.red(
            spaceTrim(`
                CWD must be root of the project

                Script: use-packages.ts
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
program.parse(process.argv);

/**
 * Remote folders that are always updated by the script.
 */
const DEFAULT_REMOTE_FOLDERS = ['examples/usage/other/vercel'];

/**
 * Dependency blocks in `package.json` that may contain Promptbook packages.
 */
const PACKAGE_DEPENDENCY_TYPES = ['dependencies', 'devDependencies'] as const;

/**
 * Files that are safe to auto-commit when this script updates a remote project.
 */
const ALLOWED_GIT_CHANGED_FILES = ['package.json', 'package-lock.json', 'Dockerfile'];

/**
 * Summary of how the script updated downstream projects.
 */
type UsePackagesSummary = {
    readonly committedProjects: Array<string>;
    readonly failedProjects: Array<{ folder: string; error: Error }>;
    readonly skippedProjects: Array<string>;
    readonly updatedProjects: Array<string>;
};

/**
 * Result of updating all managed files in a single remote folder.
 */
type RemoteFolderUpdateResult = {
    readonly hasManagedChanges: boolean;
    readonly oldVersion: string_version_dependency | null;
};

/**
 * Parsed git status details for one remote folder.
 */
type RemoteFolderGitStatus = {
    readonly changedLines: Array<string>;
    readonly unexpectedChanges: Array<string>;
};

usePackages()
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
 * Uses packages.
 */
async function usePackages() {
    console.info(`🔼🆚  Using packages`);

    warnIfUseThisPackagePathsAreMissing();

    const currentVersion = await getCurrentVersion();
    const summary = createUsePackagesSummary();

    await waitForVersionAvailabilityOnNpm(currentVersion);

    for (const remoteFolder of getRemoteFolders()) {
        await updateRemoteFolder(remoteFolder, currentVersion, summary);
    }

    logUsePackagesSummary(summary, currentVersion);
}

/**
 * Warns when no extra downstream folders were configured in the environment.
 */
function warnIfUseThisPackagePathsAreMissing(): void {
    if (!process.env.USE_THIS_PACKAGE_PATHS) {
        console.warn(colors.yellow(`Warning: USE_THIS_PACKAGE_PATHS not defined in environment`));
    }
}

/**
 * Reads the current Promptbook version from the main package manifest.
 *
 * @returns Current repository version
 */
async function getCurrentVersion(): Promise<string_version_dependency> {
    const mainPackageJson = JSON.parse(await readFile('./package.json', 'utf-8')) as PackageJson;

    return mainPackageJson.version as string_version_dependency;
}

/**
 * Waits until the freshly published version is available on npm.
 *
 * @param currentVersion - Version that should appear in the registry
 */
async function waitForVersionAvailabilityOnNpm(currentVersion: string_version_dependency): Promise<void> {
    for (let i = 0; i < LOOP_LIMIT; i++) {
        const result = await $execCommand({
            crashOnError: false,
            command: `npm show ptbk`,
        });

        if (result.includes(currentVersion)) {
            break;
        }

        console.warn(colors.gray(`Waiting for version ${currentVersion} to be available on NPM`));
        await forTime(1111 + 3333 * Math.random());
    }

    console.warn(colors.green(`Version ${currentVersion} is available on NPM`));
    await forTime(5 * 1000);
}

/**
 * Lists all downstream folders that should receive the published version.
 *
 * @returns Remote folders to update
 */
function getRemoteFolders(): Array<string> {
    return [...DEFAULT_REMOTE_FOLDERS, ...(process.env.USE_THIS_PACKAGE_PATHS || '').split(',')].filter(Boolean);
}

/**
 * Creates an empty update summary that later steps append to.
 *
 * @returns Mutable summary holder
 */
function createUsePackagesSummary(): UsePackagesSummary {
    return {
        committedProjects: [],
        failedProjects: [],
        skippedProjects: [],
        updatedProjects: [],
    };
}

/**
 * Updates managed files in one remote folder and performs the related git workflow.
 *
 * @param remoteFolder - Downstream project folder
 * @param currentVersion - Version that should be written everywhere
 * @param summary - Shared script summary
 */
async function updateRemoteFolder(
    remoteFolder: string,
    currentVersion: string_version_dependency,
    summary: UsePackagesSummary,
): Promise<void> {
    const updateResult = await updateManagedRemoteFiles(remoteFolder, currentVersion);

    await handleRemoteFolderGitWorkflow(remoteFolder, currentVersion, updateResult, summary);
}

/**
 * Updates package-managed files in a single downstream project.
 *
 * @param remoteFolder - Downstream project folder
 * @param currentVersion - Version that should be written everywhere
 * @returns Information needed for later git handling
 */
async function updateManagedRemoteFiles(
    remoteFolder: string,
    currentVersion: string_version_dependency,
): Promise<RemoteFolderUpdateResult> {
    const packageJsonUpdate = await updateRemotePackageJson(remoteFolder, currentVersion);
    const hasDockerfileChange = await updateRemoteDockerfile(remoteFolder, currentVersion);

    return {
        hasManagedChanges: packageJsonUpdate.hasManagedChanges || hasDockerfileChange,
        oldVersion: packageJsonUpdate.oldVersion,
    };
}

/**
 * Updates Promptbook dependencies in a downstream `package.json` when present.
 *
 * @param remoteFolder - Downstream project folder
 * @param currentVersion - Version that should replace Promptbook dependencies
 * @returns Whether the managed file existed and the previous dependency version
 */
async function updateRemotePackageJson(
    remoteFolder: string,
    currentVersion: string_version_dependency,
): Promise<RemoteFolderUpdateResult> {
    const remotePackageJsonPath = join(remoteFolder, 'package.json');

    if (!(await isFileExisting(remotePackageJsonPath, fs))) {
        return {
            hasManagedChanges: false,
            oldVersion: null,
        };
    }

    console.info(colors.blue(`Update version of @promptbook/* to ${currentVersion} in ${remotePackageJsonPath}`));

    const remotePackageJson = JSON.parse(await readFile(remotePackageJsonPath, 'utf-8')) as PackageJson;
    const oldVersion = updatePromptbookDependenciesVersion(remotePackageJson, currentVersion);

    await writeFile(remotePackageJsonPath, JSON.stringify(remotePackageJson, null, 4) + '\n');

    await $execCommand({
        cwd: remoteFolder,
        crashOnError: false,
        command: `npm i`,
        isVerbose: true,
    });

    return {
        hasManagedChanges: true,
        oldVersion,
    };
}

/**
 * Updates all Promptbook dependencies inside one `package.json` object.
 *
 * @param remotePackageJson - Manifest to mutate
 * @param currentVersion - Version that should replace Promptbook dependencies
 * @returns First previous Promptbook version encountered, if any
 */
function updatePromptbookDependenciesVersion(
    remotePackageJson: PackageJson,
    currentVersion: string_version_dependency,
): string_version_dependency | null {
    let oldVersion: string_version_dependency | null = null;

    for (const dependencyType of PACKAGE_DEPENDENCY_TYPES) {
        const dependencies = remotePackageJson[dependencyType];

        if (dependencies === undefined) {
            continue;
        }

        for (const packageName of Object.keys(dependencies as Record<string, string>)) {
            if (!isPromptbookDependency(packageName)) {
                continue;
            }

            if (oldVersion === null) {
                oldVersion = dependencies[packageName] as string_version_dependency;
            }

            dependencies[packageName] = currentVersion;
        }
    }

    return oldVersion;
}

/**
 * Tells whether a dependency name should be rewritten by this script.
 *
 * @param packageName - Dependency name to inspect
 * @returns `true` when the package belongs to Promptbook
 */
function isPromptbookDependency(packageName: string): boolean {
    return packageName.startsWith('@promptbook/') || packageName === 'promptbook' || packageName === 'ptbk';
}

/**
 * Updates the managed Promptbook Docker image tag in a downstream Dockerfile.
 *
 * @param remoteFolder - Downstream project folder
 * @param currentVersion - Version that should replace the image tag
 * @returns Whether the Dockerfile existed and was therefore processed
 */
async function updateRemoteDockerfile(
    remoteFolder: string,
    currentVersion: string_version_dependency,
): Promise<boolean> {
    const remoteDockerfilePath = join(remoteFolder, 'Dockerfile');

    if (!(await isFileExisting(remoteDockerfilePath, fs))) {
        return false;
    }

    console.info(colors.blue(`Update version of @promptbook/* to ${currentVersion} in ${remoteDockerfilePath}`));

    const remoteDockerfile = await readFile(remoteDockerfilePath, 'utf-8');
    const updatedDockerfile = remoteDockerfile.replace(
        /^(FROM\s+(hejny\/promptbook)):[^-]+?-[^-]+?$/gm,
        `$1:${currentVersion}`,
    );

    await writeFile(remoteDockerfilePath, updatedDockerfile);

    return true;
}

/**
 * Handles git status analysis, optional commit/push, and summary bookkeeping for one folder.
 *
 * @param remoteFolder - Downstream project folder
 * @param currentVersion - Version that should be written everywhere
 * @param updateResult - Result of managed file updates
 * @param summary - Shared script summary
 */
async function handleRemoteFolderGitWorkflow(
    remoteFolder: string,
    currentVersion: string_version_dependency,
    updateResult: RemoteFolderUpdateResult,
    summary: UsePackagesSummary,
): Promise<void> {
    if (remoteFolder.startsWith('..')) {
        recordUpdatedProjectIfNeeded(remoteFolder, updateResult.hasManagedChanges, summary);
        return;
    }

    const gitStatus = await getRemoteFolderGitStatus(remoteFolder);

    if (gitStatus.changedLines.length === 0) {
        console.info(colors.gray(`No changes in ${remoteFolder} to commit.`));
        recordUpdatedProjectIfNeeded(remoteFolder, updateResult.hasManagedChanges, summary);
        return;
    }

    logRemoteFolderGitChanges(gitStatus.changedLines);

    if (gitStatus.unexpectedChanges.length > 0) {
        logSkippedRemoteFolder(remoteFolder, gitStatus.unexpectedChanges);
        summary.skippedProjects.push(remoteFolder);
        recordUpdatedProjectIfNeeded(remoteFolder, updateResult.hasManagedChanges, summary);
        return;
    }

    await commitAndPushRemoteFolder(remoteFolder, currentVersion, updateResult.oldVersion, summary);
    recordUpdatedProjectIfNeeded(remoteFolder, updateResult.hasManagedChanges, summary);
}

/**
 * Reads and classifies git changes in a downstream project.
 *
 * @param remoteFolder - Downstream project folder
 * @returns Changed lines together with files that block auto-commit
 */
async function getRemoteFolderGitStatus(remoteFolder: string): Promise<RemoteFolderGitStatus> {
    const gitStatusResult = await $execCommand({
        cwd: remoteFolder,
        command: 'git status --porcelain',
        crashOnError: false,
    });
    const changedLines = gitStatusResult
        .trim()
        .split(/\r?\n/)
        .filter((line: string) => line);
    const changedFiles = changedLines.map((line: string) => line.split(' ', 2).pop() || '');
    const unexpectedChanges = changedFiles.filter(
        (file: string) => !ALLOWED_GIT_CHANGED_FILES.includes(basename(file)),
    );

    return {
        changedLines,
        unexpectedChanges,
    };
}

/**
 * Logs the concrete git status lines that were detected.
 *
 * @param changedLines - Raw `git status --porcelain` lines
 */
function logRemoteFolderGitChanges(changedLines: ReadonlyArray<string>): void {
    console.info(
        colors.blue(
            spaceTrim(
                (block) => `
                    Detected changes:
                    ${block(changedLines.map((line) => `- ${line}`).join('\n'))}
                `,
            ),
        ),
    );
}

/**
 * Logs why a downstream project was skipped for the auto-commit step.
 *
 * @param remoteFolder - Downstream project folder
 * @param unexpectedChanges - Files that made the folder unsafe to auto-commit
 */
function logSkippedRemoteFolder(remoteFolder: string, unexpectedChanges: ReadonlyArray<string>): void {
    console.warn(colors.yellow(`Skipping update Promptbook commit for ${remoteFolder} because of unexpected changes:`));

    for (const file of unexpectedChanges) {
        console.warn(colors.yellow(` - ${file}`));
    }
}

/**
 * Commits and pushes the managed update for one downstream project.
 *
 * @param remoteFolder - Downstream project folder
 * @param currentVersion - Version that should be written everywhere
 * @param oldVersion - Previous Promptbook version found in dependencies, if any
 * @param summary - Shared script summary
 */
async function commitAndPushRemoteFolder(
    remoteFolder: string,
    currentVersion: string_version_dependency,
    oldVersion: string_version_dependency | null,
    summary: UsePackagesSummary,
): Promise<void> {
    console.info(colors.blue(`Committing updates in ${remoteFolder}`));

    await $execCommand({
        cwd: remoteFolder,
        command: `git add .`,
    });

    const commitMessage = createUpdateCommitMessage(currentVersion, oldVersion);
    console.info(colors.bgCyan(commitMessage));

    await $execCommand({
        cwd: remoteFolder,
        command: `git commit -m "${commitMessage}"`,
    });

    try {
        await $execCommand({
            cwd: remoteFolder,
            command: 'git push',
        });
        summary.committedProjects.push(remoteFolder);
    } catch (error) {
        assertsError(error);
        summary.failedProjects.push({ folder: remoteFolder, error });
    }
}

/**
 * Creates the commit message used for downstream version bumps.
 *
 * @param currentVersion - Version that should be written everywhere
 * @param oldVersion - Previous Promptbook version found in dependencies, if any
 * @returns Commit message for the downstream repository
 */
function createUpdateCommitMessage(
    currentVersion: string_version_dependency,
    oldVersion: string_version_dependency | null,
): string {
    return `🔼🆚 Update Promptbook ${oldVersion === null ? '' : `\`${oldVersion}\` -> `}\`${currentVersion}\``;
}

/**
 * Records that a downstream project had managed files touched by this script.
 *
 * @param remoteFolder - Downstream project folder
 * @param hasManagedChanges - Whether the script updated any managed file in the folder
 * @param summary - Shared script summary
 */
function recordUpdatedProjectIfNeeded(
    remoteFolder: string,
    hasManagedChanges: boolean,
    summary: UsePackagesSummary,
): void {
    if (hasManagedChanges) {
        summary.updatedProjects.push(remoteFolder);
    }
}

/**
 * Prints the final summary in the same categories as the legacy implementation.
 *
 * @param summary - Shared script summary
 * @param currentVersion - Version that was used during the update
 */
function logUsePackagesSummary(summary: UsePackagesSummary, currentVersion: string_version_dependency): void {
    console.info('\n'.repeat(3));
    console.info(colors.bgGreen(`Promptbook ${currentVersion}:`));
    console.info(colors.green(`  Committed (${summary.committedProjects.length}):`));

    for (const remoteFolder of summary.committedProjects) {
        console.info(colors.green(`   - ${remoteFolder}`));
    }

    console.info(colors.red(`  Failed to push (${summary.failedProjects.length}):`));

    for (const { folder, error } of summary.failedProjects) {
        console.info(colors.red(`   - ${folder}: ${formatRemoteFolderPushError(error)}`));
    }

    console.info(colors.yellow(`  Skipped (unexpected changes) (${summary.skippedProjects.length}):`));

    for (const remoteFolder of summary.skippedProjects) {
        console.info(colors.yellow(`   - ${remoteFolder}`));
    }

    console.info(colors.blue(`  Updated (files modified) (${summary.updatedProjects.length}):`));

    for (const remoteFolder of summary.updatedProjects) {
        console.info(colors.blue(`   - ${remoteFolder}`));
    }
}

/**
 * Formats a push failure without the absolute current working directory prefix.
 *
 * @param error - Push failure
 * @returns Single-line error summary for the final report
 */
function formatRemoteFolderPushError(error: Error): string {
    return error.message.split(process.cwd()).join('').split(/\r?\n/).join(' ').trim();
}

// Note: [⚫] Code for repository script [use-packages](scripts/use-packages/use-packages.ts) should never be published in any package
// TODO: [🤣] Update in all places
// TODO: [👵] test before publish
// TODO: Add warning to the copy/used files
// TODO: Use prettier to format the used files
// TODO: Normalize order of keys in package.json
