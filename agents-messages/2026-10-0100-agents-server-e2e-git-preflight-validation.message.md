# Agents Server browser failures during workspace Git prerequisite validation

Running `npm test` on 2026-10-01 passed name checks, spellcheck, lint, TypeScript, package generation,
all **786 Jest suites / 3,760 tests**, and the Agents Server production build. The final Agents Server
Playwright stage failed: **9 failed, 10 passed**.

The failures cover six chat-history navigation scenarios, the agent-view header navigation scenario,
the desktop homepage header navigation scenario, and the new-agent redirect scenario. Assertions encounter
missing login/navigation or chat UI elements. The new-agent redirect assertion resolves
`textarea.chat-input-textarea` to two elements and fails Playwright's strict locator check.

The E2E server also logs missing `POSTGRES_URL` / `DATABASE_URL` when processing durable chat jobs.
These errors are observations, not a confirmed common cause of the browser failures. Some symptoms overlap
the earlier [login and database report](2026-09-2100-agents-server-e2e-login-and-database.message.md).

No Agents Server application or browser-test code was changed for the workspace Git prerequisite task.
The relevant Coder tests, Git edge-case tests, and installed packaged-CLI smoke tests passed, including
initialization and recovery outside the monorepo. The browser failures need a separate investigation.

Reproduce with `npm test` or `npm run test-app-agents-server`. The local run log is
`/tmp/promptbook-git-preflight-npm-test.log`; Playwright saved screenshots, error contexts and videos under
`other/integration-tests/videos/`.

## Follow-up validation

A subsequent `npm test` run on 2026-10-01 passed the preliminary checks, **786 Jest suites / 3,762 tests**,
package generation and the Agents Server production build. The browser stage reported **8 failed, 11 passed**:
the six chat-history scenarios, agent-view navigation and desktop profile-to-home navigation still fail. The
new-agent redirect test passed on this run. Durable chat jobs again log missing `POSTGRES_URL` / `DATABASE_URL`.
The current run log is `/tmp/ptbk-git-preflight-npm-test.log`.

Focused follow-up tests passed for shared Git discovery, command ordering, both initializers, scoped commits,
the installed packed CLI, and nested-project isolation. The original isolation regression tests were retained
and passed alongside the added real-repository tests. No Agents Server implementation or browser tests were
modified to address these out-of-scope failures.
