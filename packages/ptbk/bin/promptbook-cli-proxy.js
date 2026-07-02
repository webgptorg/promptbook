#!/usr/bin/env node
//               <- TODO: [🎺] Ensure correct version of Node.js is used
// promptbook-cli-proxy.js

/**
 * Note: [🔺] Purpose of this file is to forward `ptbk` package launches to `@promptbook/cli`
 */

const { realpathSync } = require('fs');
const { dirname, resolve } = require('path');

const PROMPTBOOK_CLI_BIN_PATH = '@promptbook/cli/bin/promptbook-cli.js';
const PROMPTBOOK_PACKAGE_JSON_PATH = 'promptbook/package.json';
const PTBK_PACKAGE_JSON_PATH = 'ptbk/package.json';
const PTBK_PROXY_BIN_PATH = 'bin/promptbook-cli-proxy.js';
const CURRENT_PACKAGE_ROOT = resolve(__dirname, '..');

const localPtbkEntrypoint = resolveLocalPtbkEntrypoint();

if (localPtbkEntrypoint !== null) {
    require(localPtbkEntrypoint);
} else {
    require(resolvePromptbookCliEntrypoint());
}

/**
 * Resolves a cwd-local `ptbk` launcher when this proxy was reached from another install.
 *
 * This keeps `ptbk about` aligned with the project dependency even when another
 * `ptbk` install appears earlier on PATH.
 */
function resolveLocalPtbkEntrypoint() {
    const localPtbkPackageJsonPath = tryRequireResolve(PTBK_PACKAGE_JSON_PATH, [process.cwd()]);

    if (localPtbkPackageJsonPath === null) {
        return null;
    }

    const localPtbkPackageRoot = dirname(localPtbkPackageJsonPath);

    if (isSameFilesystemPath(localPtbkPackageRoot, CURRENT_PACKAGE_ROOT)) {
        return null;
    }

    return resolve(localPtbkPackageRoot, PTBK_PROXY_BIN_PATH);
}

/**
 * Resolves the CLI binary from this package graph.
 */
function resolvePromptbookCliEntrypoint() {
    const directPromptbookCliEntrypoint = tryRequireResolve(PROMPTBOOK_CLI_BIN_PATH, [
        CURRENT_PACKAGE_ROOT,
        __dirname,
    ]);

    if (directPromptbookCliEntrypoint !== null) {
        return directPromptbookCliEntrypoint;
    }

    const promptbookPackageRoot = dirname(
        require.resolve(PROMPTBOOK_PACKAGE_JSON_PATH, {
            paths: [CURRENT_PACKAGE_ROOT, __dirname],
        }),
    );

    return require.resolve(PROMPTBOOK_CLI_BIN_PATH, {
        paths: [promptbookPackageRoot, CURRENT_PACKAGE_ROOT, __dirname],
    });
}

/**
 * Resolves a module path and returns `null` when it cannot be resolved.
 */
function tryRequireResolve(modulePath, resolvePaths) {
    try {
        return require.resolve(modulePath, { paths: resolvePaths });
    } catch {
        return null;
    }
}

/**
 * Compares filesystem paths after resolving symlinks where possible.
 */
function isSameFilesystemPath(firstPath, secondPath) {
    return normalizeFilesystemPath(firstPath) === normalizeFilesystemPath(secondPath);
}

/**
 * Normalizes one filesystem path for cross-platform comparisons.
 */
function normalizeFilesystemPath(path) {
    let resolvedPath = resolve(path);

    try {
        resolvedPath = realpathSync(resolvedPath);
    } catch {
        // Keep the resolved path when a transient install path cannot be realpathed.
    }

    return process.platform === 'win32' ? resolvedPath.toLowerCase() : resolvedPath;
}
