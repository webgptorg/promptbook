# 14 of the 19 Agents Server E2E tests fail on `main`

While optimizing the speed of `npm run test-app-agents-server`, the very same 14 tests failed **before and after** the optimization, and they fail with an identical list on macOS and on Windows. This is a pre-existing failure on `main`, not a regression of the speed work, and it was left untouched because it is outside the scope of that prompt.

## What fails

`5 passed`, `14 failed` out of `Running 19 tests using 1 worker`:

-   `tests/e2e/chat-history-navigation.spec.ts` — all 9 tests
-   `tests/e2e/header-agent-view-navigation.spec.ts:26`
-   `tests/e2e/header-homepage-navigation.spec.ts:79` and `:98`
-   `tests/e2e/management-api.spec.ts:44`
-   `tests/e2e/new-agent-redirect.spec.ts:76`

## Why they fail

There look to be two linked causes, both server-side:

1.  **Creating a test agent answers `500`.** The very first failing test stops at `Error: page.evaluate: Error: Failed to create test agent: 500` in [`tests/e2e/support/AgentManagementApi.ts`](../apps/agents-server/tests/e2e/support/AgentManagementApi.ts).

2.  **The bundled `adam` agent cannot be resolved at all.** The E2E web server logs the same branded `ParseError` 82 times in one run:

    ```
    Cyclic `FROM` reference detected while resolving agent source.

    Resolution chain:
    - `http://127.0.0.1:4440/agents/adam`
    - `http://127.0.0.1:4440/agents/adam`
    ```

    The chain contains the identical URL twice, so the cycle detection fires on the **first** resolution step. That reads much more like an agent which resolves its own public URL as its `FROM` source than like a genuine cycle between two agents. Because of it, `/agents/get-started` and the web manifest fail to generate their metadata, and every page which the failing tests navigate to renders the error boundary instead.

Once that happens, all the failures collapse into the same symptom: [`loginAsAdmin`](../apps/agents-server/tests/e2e/support/auth.ts) succeeds at the login dialog, then waits 10 s for `getByRole('button', { name: /admin/i })` on a page which never rendered its header.

## Why it matters beyond the red suite

Each of the 13 follow-up failures burns the full 10 s `expect` timeout, so the broken agent resolution alone adds well over two minutes to every single run of `npm run test-app-agents-server`. Fixing it makes the suite both green and considerably faster.

## Evidence

The prompt [`prompts/2026-08-0010-optimize-test-agents-server.md`](../prompts/2026-08-0010-optimize-test-agents-server.md) contains the full macOS log with exactly this failure list, and a Windows run on the same commit reproduced it test for test.
