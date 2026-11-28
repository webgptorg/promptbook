# Agents Server E2E login and navigation failures during harness-default validation

Running `npm test` while updating `ptbk coder` model defaults on 2026-09-21 passed name checks, spellcheck,
lint, TypeScript, package generation, all **767 Jest suites / 3,431 tests**, and the Agents Server production
build. The final Agents Server Playwright stage failed: **11 failed, 8 passed**.

Ten failures time out in `tests/e2e/support/auth.ts:82`, waiting for the desktop button matching `/admin/i`
after the login dialog closes. They affect the admin API authorization test, eight chat-history tests,
and the desktop homepage navigation test from an agent profile. The server logs successful authentication,
so this assertion alone does not establish that authorization is broken.

The remaining failure is `tests/e2e/header-agent-view-navigation.spec.ts:43`: the profile link opens a
different agent ID from the one created by that test.

The E2E server also logs missing `POSTGRES_URL` / `DATABASE_URL` while processing durable chat jobs,
worker-trigger HTTP 500 responses, and missing `OPENAI_API_KEY` during agent pre-indexing. These are observed
errors, not a confirmed explanation for every browser-test failure.

No Agents Server application or E2E code was changed for this task. These failures overlap the earlier
[E2E suite report](2026-08-0700-agents-server-e2e-suite-mostly-red.message.md) and
[mock-filter report](2026-09-0800-agents-server-e2e-mock-ilike-filter-still-fails.message.md).
They need a separate investigation; model-default tests and the coder landing-page build and browser
checks passed.

Reproduce with `npm test` or `npm run test-app-agents-server`. The local run log is
`/tmp/promptbook-harness-npm-test.log`; Playwright saved failure artifacts under
`other/integration-tests/videos/`.
