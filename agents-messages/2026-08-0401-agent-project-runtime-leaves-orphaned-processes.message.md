# Terminating a child-process agent project runtime leaves orphaned processes behind

While verifying the `ptbk` CLI startup optimization, `npm run test-for-ptbk-coder` failed in
[`agentProjectRuntimeRegistry.test.ts`](../apps/agents-server/src/utils/agentProjects/agentProjectRuntimeRegistry.test.ts):

```text
FAIL apps/agents-server/src/utils/agentProjects/agentProjectRuntimeRegistry.test.ts
  ● agentProjectRuntimeRegistry › runs the package dev script when one is declared

    EBUSY: resource busy or locked, rmdir 'C:\Users\me\AppData\Local\Temp\promptbook-project-runtime-LW9fxG\agent-abc123\projects\website'
```

This is **not** caused by the CLI startup optimization - the whole import graph of that test consists only of
`apps/agents-server/**`, `src/errors/*`, `src/utils/organization/spaceTrim` and Node built-ins, none of which the
optimization touches. The failure reproduces on a clean checkout of the test when it is run alone.

## Why it happens

`startChildProcessAgentProjectDevRuntime` spawns the dev command with `shell: true`, so on Windows the real process tree
is `cmd.exe` → `npm run dev` → `node server.js`, and **every** process of that tree has the project folder as its
working directory.

`terminateAgentProjectRuntimeRecord` then tears the runtime down like this:

1. `runtimeRecord.childProcess.kill()` - on Windows this terminates only the direct child (`cmd.exe`), not its
   descendants.
2. `killProcessListeningOnPort(runtimeRecord.port)` - kills the one process that actually holds the TCP port
   (`node server.js`).
3. `waitForTcpPortToStopListening(...)` - waits for the **port**, not for the processes.

The intermediate `npm` process is never signaled. It exits on its own once its child dies, but that happens *after* the
port is already free, so `terminateAgentProjectRuntimeForProject` resolves while a process still holds the project
folder open. On Windows a folder that is the working directory of a live process cannot be removed, hence `EBUSY`.

So there are two independent facts:

1. Stopping a project runtime resolves before the spawned process tree is really gone.
2. On Linux/macOS the same orphan survives the `terminate` call, it is just invisible because deleting an open folder is
   allowed there.

## What was done for now

Only the test teardown was made tolerant of the lingering handle, by passing `maxRetries` / `retryDelay` to `fs.rm` -
the Node API that exists exactly for this Windows case. **The product behavior was intentionally left untouched**,
because it is outside the scope of the CLI-startup task.

## Suggested next step

Make `terminateAgentProjectRuntimeRecord` terminate the whole spawned process tree instead of just the direct child and
the port owner - `taskkill /PID <pid> /T /F` on Windows and a process-group kill (`spawn(..., { detached: true })` plus
`process.kill(-pid)`) on Unix - and wait for the child process `exit` event before resolving. That removes the orphaned
`npm` processes on real servers too, not only in the test.
