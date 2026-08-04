# `npm run test-unit` intermittently crashes on Windows while Jest force-exits its workers

While verifying the `ptbk` CLI startup optimization, the `test-unit` step of `npm run test-for-ptbk-coder` failed even though every test had passed:

```text
node:events:496
      throw er; // Unhandled 'error' event
      ^

Error: kill EPERM
    at ChildProcess.kill (node:internal/child_process:511:26)
    at ChildProcessWorker.killChild (node_modules/jest-worker/build/workers/ChildProcessWorker.js:411:17)
    at ChildProcessWorker.forceExit (node_modules/jest-worker/build/workers/ChildProcessWorker.js:416:33)
    at Timeout._onTimeout (node_modules/jest-worker/build/base/BaseWorkerPool.js:137:16)
```

A local rerun of the very same command finished with `Test Suites: 659 passed, 659 total`, `Tests: 7 todo, 2810 passed, 2817 total` and exit code `0`, but it still printed:

```text
A worker process has failed to exit gracefully and has been force exited.
```

## Why it happens

`BaseWorkerPool.end()` gives every worker `500 ms` to shut down and then calls `ChildProcessWorker.forceExit()`, which runs `childProcess.kill('SIGTERM')`. On Windows a `kill` that lands on a process which is already terminating fails with `EPERM`, and Node re-emits that as an unhandled `'error'` event on the `ChildProcess`, so the whole Jest run dies with exit code `1` after all the tests already passed.

So there are two independent facts:

1. A worker of this repository regularly needs **more than 500 ms** to exit after the last test - the warning above is printed on healthy runs too.
2. Whenever the force kill happens to race with the worker's own exit on Windows, the run crashes instead of reporting the (successful) results.

This is **not** caused by the CLI startup optimization - none of the packages that were made lazy (`jsdom`, `@openai/agents`, `openai`, `@anthropic-ai/sdk`, `@azure/openai`, `jszip`, `socket.io-client`, `prompts`, `@mozilla/readability`) keeps a Node process alive when it is required, and the optimization only ever *removes* eagerly loaded modules. The `--forceExit` flag together with the `_TODO-0` note in [`package.json`](../package.json) *("now its present to ensure return code 0 when all tests")* was added long before this task, which documents that the slow worker shutdown already existed.

## Suggested next step

Find the handle that keeps the worker alive after the last test - running `npx jest --detectOpenHandles` over the process-spawning and database-backed suites is the cheapest starting point - and release it in the relevant `afterAll`. Once the workers exit on their own, both the warning and this Windows-only crash disappear and `--forceExit` can finally be dropped as `_TODO-0` asks. Switching the pool to `workerThreads: true` in [`jest.config.js`](../jest.config.js) would also remove the `kill EPERM` class of failures, but it changes worker isolation for all 659 suites, so it should be evaluated separately.
