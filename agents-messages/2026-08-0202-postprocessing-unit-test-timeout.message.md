# `postprocessing.test.ts` times out in the full unit suite

While verifying the Book language manual task, the repository-wide `npm run test-unit` suite also failed outside the changed code:

```text
FAIL src/scripting/_test/postprocessing.test.ts (1025.659 s)
createPipelineExecutor + postprocessing › should work when every INPUT PARAMETER defined

Exceeded timeout of 300000 ms for a test.
```

The timed-out test is [`src/scripting/_test/postprocessing.test.ts`](../src/scripting/_test/postprocessing.test.ts:11). It took more than five minutes and is unrelated to Book language documentation, so it was not changed here.

The complete suite result was 651 passing suites and 2 failing suites; the other failure is documented in [`2026-08-0201-run-multiple-agent-messages-flaky-unit-test.message.md`](./2026-08-0201-run-multiple-agent-messages-flaky-unit-test.message.md).

## Suggested next step

Reproduce the test in isolation with logging around `getPipelineExecutor()` and the postprocessing call to establish whether a dependent service, an open handle, or a promise that no longer settles is responsible. The test should then use a deterministic local dependency or an explicit, bounded mock rather than relying on an unbounded external or background operation.
