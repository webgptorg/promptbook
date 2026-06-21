#!/usr/bin/env node

const { execFileSync } = require('node:child_process');
const { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const path = require('node:path');

/**
 * Absolute path to the repository root.
 */
const repositoryRoot = path.resolve(__dirname, '../..');

/**
 * Absolute path to the VSCode extension app directory.
 */
const vscodeExtensionRoot = path.join(repositoryRoot, 'apps/vscode-extension');

/**
 * Absolute path to the root package manifest.
 */
const rootPackageJsonPath = path.join(repositoryRoot, 'package.json');

/**
 * Absolute path to the root license file.
 */
const rootLicensePath = path.join(repositoryRoot, 'LICENSE.md');

/**
 * Absolute path to the VSCode extension package manifest.
 */
const extensionPackageJsonPath = path.join(vscodeExtensionRoot, 'package.json');

/**
 * Absolute path to the license file included only while packaging the extension.
 */
const extensionLicensePath = path.join(vscodeExtensionRoot, 'LICENSE.md');

/**
 * npm executable name for the current platform.
 */
const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';

/**
 * npx executable name for the current platform.
 */
const npxExecutable = process.platform === 'win32' ? 'npx.cmd' : 'npx';

/**
 * Whether the packaged VSIX should also be published to the VSCode Marketplace.
 */
const isPublishing = process.argv.includes('--publish');

/**
 * Root package metadata.
 */
const rootPackageJson = JSON.parse(readFileSync(rootPackageJsonPath, 'utf-8'));

/**
 * Original VSCode extension package manifest text, restored after packaging.
 */
const originalExtensionPackageJson = readFileSync(extensionPackageJsonPath, 'utf-8');

/**
 * Original VSCode extension license text, restored after packaging when present.
 */
const originalExtensionLicenseText = existsSync(extensionLicensePath)
    ? readFileSync(extensionLicensePath, 'utf-8')
    : undefined;

/**
 * VSCode extension package metadata used only while packaging.
 */
const extensionPackageJson = JSON.parse(originalExtensionPackageJson);

/**
 * Marketplace-safe version derived from the Promptbook package version.
 */
const extensionVersion = toMarketplaceVersion(rootPackageJson.version);

/**
 * Whether the root version is a prerelease version.
 */
const isPreRelease = rootPackageJson.version !== extensionVersion;

/**
 * Absolute path to the generated VSIX artifact.
 */
const vsixPath = path.join(vscodeExtensionRoot, `${extensionPackageJson.name}-${extensionVersion}.vsix`);

/**
 * Runs an npm command in the repository root.
 *
 * @param {ReadonlyArray<string>} args - npm CLI arguments
 * @returns {void}
 */
function runRootNpm(args) {
    runCommand(npmExecutable, args, repositoryRoot);
}

/**
 * Runs an npm command in the VSCode extension app directory.
 *
 * @param {ReadonlyArray<string>} args - npm CLI arguments
 * @returns {void}
 */
function runExtensionNpm(args) {
    runCommand(npmExecutable, args, vscodeExtensionRoot);
}

/**
 * Runs the VSCode extension publishing tool in the app directory.
 *
 * @param {ReadonlyArray<string>} args - vsce CLI arguments
 * @returns {void}
 */
function runVsce(args) {
    runCommand(npxExecutable, ['vsce', ...args], vscodeExtensionRoot);
}

/**
 * Runs a child process with inherited stdio.
 *
 * Windows resolves npm/npx through `.cmd` shims, which need shell execution when
 * spawned from this repository script on some Node versions.
 *
 * @param {string} executable - Executable to run
 * @param {ReadonlyArray<string>} args - Command arguments
 * @param {string} cwd - Working directory
 * @returns {void}
 */
function runCommand(executable, args, cwd) {
    execFileSync(executable, args, {
        cwd,
        shell: process.platform === 'win32',
        stdio: 'inherit',
    });
}

/**
 * Converts the root Promptbook version to a Marketplace-supported extension version.
 *
 * VSCode Marketplace only supports `major.minor.patch`, so Promptbook prerelease
 * versions like `0.112.0-123` are mapped to `0.112.123` and published with
 * `--pre-release`.
 *
 * @param {string | undefined} version - Root package version
 * @returns {string} Marketplace-safe extension version
 */
function toMarketplaceVersion(version) {
    if (typeof version !== 'string') {
        throw new Error('Root package version is missing');
    }

    const versionMatch = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(\d+))?$/u);

    if (versionMatch === null) {
        throw new Error(`Root package version "${version}" is not supported by the VSCode extension build`);
    }

    const [, major, minor, patch, prerelease] = versionMatch;

    if (prerelease === undefined) {
        return `${major}.${minor}.${patch}`;
    }

    return `${major}.${minor}.${Number(patch) * 1000 + Number(prerelease)}`;
}

/**
 * Removes stale VSIX files from the extension directory before packaging.
 *
 * @returns {void}
 */
function removeOldVsixArtifacts() {
    for (const directoryEntryName of readdirSync(vscodeExtensionRoot)) {
        if (!directoryEntryName.endsWith('.vsix')) {
            continue;
        }

        rmSync(path.join(vscodeExtensionRoot, directoryEntryName), { force: true });
    }
}

/**
 * Writes the temporary extension package manifest used for packaging/publishing.
 *
 * @returns {void}
 */
function writeTemporaryExtensionPackageJson() {
    writeFileSync(
        extensionPackageJsonPath,
        `${JSON.stringify(
            {
                ...extensionPackageJson,
                version: extensionVersion,
            },
            null,
            4,
        )}\n`,
        'utf-8',
    );
}

/**
 * Writes the repository license into the extension package root for VSIX metadata.
 *
 * @returns {void}
 */
function writeTemporaryExtensionLicense() {
    writeFileSync(extensionLicensePath, readFileSync(rootLicensePath, 'utf-8'), 'utf-8');
}

/**
 * Restores the extension package root after packaging.
 *
 * @returns {void}
 */
function restoreTemporaryExtensionFiles() {
    writeFileSync(extensionPackageJsonPath, originalExtensionPackageJson, 'utf-8');

    if (originalExtensionLicenseText === undefined) {
        rmSync(extensionLicensePath, { force: true });
        return;
    }

    writeFileSync(extensionLicensePath, originalExtensionLicenseText, 'utf-8');
}

/**
 * Packages the extension into a VSIX file.
 *
 * @returns {void}
 */
function packageExtension() {
    const packageArgs = ['package', '--out', vsixPath];

    if (isPreRelease) {
        packageArgs.push('--pre-release');
    }

    runVsce(packageArgs);
}

/**
 * Publishes the already-built VSIX file to the VSCode Marketplace.
 *
 * @returns {void}
 */
function publishExtension() {
    if (process.env.VSCE_PAT === undefined || process.env.VSCE_PAT === '') {
        throw new Error('Publishing requires the VSCE_PAT environment variable');
    }

    const publishArgs = ['publish', '--packagePath', vsixPath];

    if (isPreRelease) {
        publishArgs.push('--pre-release');
    }

    runVsce(publishArgs);
}

console.info(`Building VSCode extension for Promptbook ${rootPackageJson.version}`);
console.info(`Using Marketplace extension version ${extensionVersion}${isPreRelease ? ' (pre-release)' : ''}`);

try {
    runRootNpm(['run', 'generate-vscode-grammar']);
    runExtensionNpm(['ci']);
    rmSync(path.join(vscodeExtensionRoot, 'out'), { recursive: true, force: true });
    removeOldVsixArtifacts();
    writeTemporaryExtensionPackageJson();
    writeTemporaryExtensionLicense();
    packageExtension();

    if (isPublishing) {
        publishExtension();
    }
} finally {
    restoreTemporaryExtensionFiles();
}
