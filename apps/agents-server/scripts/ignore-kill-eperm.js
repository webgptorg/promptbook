'use strict';

/**
 * Best-effort Windows guard for child-process shutdown races during `next build`.
 *
 * Next.js and `jest-worker` can attempt to kill helper processes that are already
 * exiting, which intermittently throws `EPERM` on Windows. Treat those cleanup-only
 * failures as non-fatal so the build can finish normally.
 */
const { ChildProcess } = require('node:child_process');

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
