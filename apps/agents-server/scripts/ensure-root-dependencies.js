'use strict';

const { createHash } = require('node:crypto');
const { createRequire } = require('node:module');
const { existsSync, readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const { runNpm } = require('./run-npm.js');

/**
 * Root directory whose dependency tree is used by the Agents Server app.
 */
const REPOSITORY_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Root package lock file used to validate the installed dependency tree.
 */
const PACKAGE_LOCK_FILE_PATH = path.join(REPOSITORY_ROOT, 'package-lock.json');

/**
 * Marker persisted inside `node_modules` after a successful root dependency installation.
 */
const ROOT_DEPENDENCY_MARKER_PATH = path.join(
    REPOSITORY_ROOT,
    'node_modules',
    '.promptbook-package-lock-hash',
);

/**
 * Small set of packages required to recognize a usable root dependency tree.
 */
const REQUIRED_ROOT_PACKAGE_NAMES = ['next', 'typescript', 'ts-node', '@playwright/test'];

/**
 * Ensures that installing the nested app does not reinstall the root dependency tree on every run.
 */
function ensureRootDependencies() {
    const packageLockHash = createPackageLockHash();

    if (isRootDependencyTreeCurrent(packageLockHash)) {
        return;
    }

    runNpm(['ci', '--include=dev', '--prefer-offline', '--no-audit', '--no-fund'], {
        cwd: REPOSITORY_ROOT,
    });

    writeFileSync(ROOT_DEPENDENCY_MARKER_PATH, `${packageLockHash}\n`, 'utf8');
}

/**
 * Creates a stable hash for the root package lock file.
 *
 * @returns SHA-256 hash of the package lock contents.
 */
function createPackageLockHash() {
    return createHash('sha256').update(readFileSync(PACKAGE_LOCK_FILE_PATH)).digest('hex');
}

/**
 * Checks whether the root dependency tree matches the current package lock file.
 *
 * @param packageLockHash - Expected package lock hash.
 * @returns Whether the existing root dependency tree can be reused.
 */
function isRootDependencyTreeCurrent(packageLockHash) {
    if (!existsSync(ROOT_DEPENDENCY_MARKER_PATH)) {
        return false;
    }

    if (readFileSync(ROOT_DEPENDENCY_MARKER_PATH, 'utf8').trim() !== packageLockHash) {
        return false;
    }

    const rootRequire = createRequire(path.join(REPOSITORY_ROOT, 'package.json'));

    return REQUIRED_ROOT_PACKAGE_NAMES.every((packageName) => {
        try {
            rootRequire.resolve(`${packageName}/package.json`);
            return true;
        } catch {
            return false;
        }
    });
}

ensureRootDependencies();
