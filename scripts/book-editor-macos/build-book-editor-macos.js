#!/usr/bin/env node

const { execFileSync } = require('node:child_process');
const { readFileSync, rmSync, writeFileSync } = require('node:fs');
const path = require('node:path');

/**
 * Absolute path to the repository root.
 */
const repositoryRoot = path.resolve(__dirname, '../..');

/**
 * Absolute path to the macOS Book Editor app directory.
 */
const bookEditorMacosRoot = path.join(repositoryRoot, 'apps/book-editor-macos');

/**
 * Absolute path to the root package manifest.
 */
const rootPackageJsonPath = path.join(repositoryRoot, 'package.json');

/**
 * Absolute path to the macOS Book Editor package manifest.
 */
const appPackageJsonPath = path.join(bookEditorMacosRoot, 'package.json');

/**
 * Absolute path to the generated Electron Builder output directory.
 */
const appReleaseDirectoryPath = path.join(bookEditorMacosRoot, 'release');

/**
 * npm executable name for the current platform.
 */
const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';

/**
 * Root package metadata.
 */
const rootPackageJson = JSON.parse(readFileSync(rootPackageJsonPath, 'utf-8'));

/**
 * Original macOS app package manifest text, restored after packaging.
 */
const originalAppPackageJson = readFileSync(appPackageJsonPath, 'utf-8');

/**
 * macOS app package metadata used only while Electron Builder is packaging.
 */
const appPackageJson = JSON.parse(originalAppPackageJson);

/**
 * Runs an npm command in the macOS Book Editor app directory.
 *
 * @param {ReadonlyArray<string>} args - npm CLI arguments
 * @returns {void}
 */
function runAppNpm(args) {
    execFileSync(npmExecutable, args, {
        cwd: bookEditorMacosRoot,
        stdio: 'inherit',
    });
}

console.info(`Building Book Editor macOS app for Promptbook ${rootPackageJson.version}`);

try {
    runAppNpm(['ci']);
    rmSync(appReleaseDirectoryPath, { recursive: true, force: true });

    writeFileSync(
        appPackageJsonPath,
        `${JSON.stringify(
            {
                ...appPackageJson,
                version: rootPackageJson.version,
            },
            null,
            4,
        )}\n`,
        'utf-8',
    );

    runAppNpm(['run', 'package']);
} finally {
    writeFileSync(appPackageJsonPath, originalAppPackageJson, 'utf-8');
}
