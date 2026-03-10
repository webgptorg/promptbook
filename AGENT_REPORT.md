# Agent Report

## 2026-03-07

- `npm run test-app-agents-server` fails in the `test-e2e` stage with a server startup/runtime error:
  - `ReferenceError: window is not defined` during Next.js build/runtime in generated server chunks.
  - Followed by `Error: Process from config.webServer was not able to start. Exit code: 1`.
  - Also logs `uncaughtException [Error: kill EPERM]` while shutting down the web server process.
  - Observed after this task's change, but appears unrelated to the clone-folder patch because the error occurs in e2e server boot/build flow.

## 2026-03-09

- `npm run test-app-agents-server` now passes, but still emits recurring server-side runtime errors during build/start:
  - `ReferenceError: window is not defined` from Next.js server chunks, including stack frames resolving to `app/agents/[agentName]/website-integration/page.js`.
  - These appear as `unhandledRejection` logs while tests continue, indicating a latent SSR/client-boundary issue not addressed in this scoped E2E-fix task.

- `npm run test-app-agents-server` failed again in `test-e2e` in this run:
  - Repeated `ReferenceError: window is not defined` during web-server startup/runtime.
  - Follow-up environment/runtime noise appears (missing seeded agents like `manifest` / `get-started`, and missing optional provider package `@promptbook/anthropic-claude` for avatar generation).
  - This failure was observed while implementing Book history version naming; no direct code path in this task touches `website-integration` SSR/runtime.

## 2026-03-10

- While validating the E2E navigation fix, full `npm run test-e2e` still showed unrelated instability:
  - `api-authorization.spec.ts` timed out on `page.goto('/')` with in-page `Application error` (`Loading chunk ... failed`).
  - `authentication-and-navigation.spec.ts` clone-flow test timed out waiting for `More options`; failure snapshot showed `Agent Not Found` after agent creation.
  - The run also logged recurrent `ReferenceError: window is not defined` server runtime errors and missing optional avatar provider package noise (`@promptbook/anthropic-claude`), suggesting broader app/runtime flakiness outside this scoped test-selector fix.
