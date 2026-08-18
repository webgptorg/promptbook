# `ptbk.test.ts` times out in the full unit suite

While verifying the project chip popup task, the repository-wide `npm run test-unit` suite failed outside the changed code:

```text
FAIL src/cli/test/ptbk.test.ts (43771.185 s)
how promptbookCli works › should expose `agents-server dev` command

Exceeded timeout of 300000 ms for a test.
```

The whole run reported `Test Suites: 1 failed, 709 passed, 710 total` and took `43800.412 s` — so [`src/cli/test/ptbk.test.ts`](../src/cli/test/ptbk.test.ts:96) alone accounted for essentially the entire twelve-hour run, while the second Jest worker finished the other 709 suites.

The failure is not reproducible. Re-run on its own the suite passes completely, and the test that timed out is nowhere near the limit:

```text
√ should expose `agents-server dev` command (13499 ms)

Test Suites: 1 passed, 1 total
Tests:       17 passed, 17 total
Time:        223.497 s, estimated 43772 s
```

13.5 s against a 300 s timeout, and 223 s for the whole suite against the 43772 s Jest remembered from the failed run.

Two observations suggest the machine, not the test, is responsible:

-   The suite has 15 tests and `jest.config.js` sets `testTimeout` to 5 minutes, so even if _every_ test had timed out the suite could not exceed roughly 4500 s. A wall clock of 43771 s therefore cannot come from the tests themselves and points at the host being suspended or starved mid-run.
-   The twelve sibling tests that spawn the exact same CLI through the exact same module graph all passed, including `agents-server start --help`, which is registered by the same [`initializeAgentsServerRuntimeCommand`](../src/cli/cli-commands/agents-server/run.ts:105) as the `dev` command that failed. A real regression in loading or registering the command would have failed those too.

## Suggested next step

The suite is nonetheless the slowest one in the repository by a wide margin: 15 of its 17 tests each spawn a fresh `ts-node --transpile-only` process that re-transpiles the whole CLI just to read one help string, at 13 to 17 seconds per spawn on an idle machine. That is essentially the entire 223 s runtime spent on process startup for assertions about static text, and it is what leaves the suite exposed to any host hiccup.

Consider collecting the help output of every command from a single CLI process — for example one `--help` walk over the registered commands, or one spawn whose output every assertion then reads — so the file costs one startup instead of thirteen. Independently, `maxWorkers: 2` means one slow suite blocks half the pool for the whole run, so it is worth checking whether this file should be scheduled first.
