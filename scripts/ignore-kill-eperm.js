'use strict';

/**
 * Best-effort Windows guard for child-process shutdown races, preloaded through `node -r` into
 * `npm run test-unit` and into the `next build` of the Agents Server.
 *
 * Next.js and `jest-worker` can attempt to kill helper processes that are already exiting, which
 * fails with `EPERM` on Windows. Node reports such a failure by emitting an `error` event on the
 * `ChildProcess`, and because nobody listens for it, the emit throws out of `kill` synchronously.
 * Both callers kill from inside a bare `setTimeout` callback — `BaseWorkerPool.end()` force-exits
 * a worker which needed more than its 500 ms shutdown budget, and follows it with a `SIGKILL` —
 * so the throw becomes an uncaught exception which kills the whole run after all the tests already
 * passed. Treat those cleanup-only failures as non-fatal so the run can finish and report its real
 * result.
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
