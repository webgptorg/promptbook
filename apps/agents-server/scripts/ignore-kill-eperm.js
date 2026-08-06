'use strict';

/**
 * Best-effort Windows guard for child-process shutdown races during `next build`.
 *
 * Next.js and `jest-worker` can attempt to kill helper processes that are already
 * exiting, which intermittently throws `EPERM` on Windows. Treat those cleanup-only
 * failures as non-fatal so the build can finish normally.
 */
const { ChildProcess } = require('node:child_process');
const { basename } = require('node:path');

/**
 * Prefix of temporary directories created by the Sentry bundler plugin during source-map upload.
 */
const SENTRY_BUNDLER_PLUGIN_TEMPORARY_DIRECTORY_PREFIX = 'sentry-bundler-plugin-upload-';

/**
 * Original `ChildProcess.kill` implementation restored only when the process exits.
 */
const originalKill = ChildProcess.prototype.kill;

ChildProcess.prototype.kill = function patchedKill(signal) {
    try {
        return originalKill.call(this, signal);
    } catch (error) {
        if (
            error instanceof Error &&
            'code' in error &&
            (error.code === 'EPERM' || error.code === 'ESRCH')
        ) {
            return false;
        }

        throw error;
    }
};

/**
 * Ignores a Windows-only Sentry temporary-directory cleanup race after the build work has completed.
 *
 * The Sentry bundler plugin occasionally attempts to remove its own temporary upload directory while
 * a Windows file handle is still closing. The source-map upload is already complete; only the temporary
 * directory cleanup fails with `ENOTEMPTY`. All other unhandled rejections stay fatal.
 */
process.on('unhandledRejection', (error) => {
    if (!isSentryTemporaryDirectoryCleanupError(error)) {
        throw error;
    }

    console.warn(`Ignoring Sentry temporary-directory cleanup failure: ${error.path}`);
});

/**
 * Returns whether an unknown rejection is the Sentry bundler plugin's temporary-directory cleanup race.
 *
 * @param error - Unhandled rejection value.
 * @returns `true` only for a Sentry temporary-directory `ENOTEMPTY` cleanup error.
 */
function isSentryTemporaryDirectoryCleanupError(error) {
    return (
        error instanceof Error &&
        error.code === 'ENOTEMPTY' &&
        error.syscall === 'rmdir' &&
        typeof error.path === 'string' &&
        basename(error.path).startsWith(SENTRY_BUNDLER_PLUGIN_TEMPORARY_DIRECTORY_PREFIX)
    );
}
