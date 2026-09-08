# Agents Server E2E mock `ilike` filter remains broken

While validating the unrelated Node.js 26 `ptbk` installation fix, `npm test` completed the root checks and Jest suite,
then failed in `npm run test-app-agents-server`: `11 passed`, `8 failed` out of 19 Playwright tests.

The failures are the same persisted-chat and management-API cases documented in
[`2026-08-2000-agents-server-e2e-mock-ilike-filter.message.md`](2026-08-2000-agents-server-e2e-mock-ilike-filter.message.md):

- `tests/e2e/chat-history-navigation.spec.ts` — four cases
- `tests/e2e/header-agent-view-navigation.spec.ts:26`
- `tests/e2e/header-homepage-navigation.spec.ts:79` and `:98`
- `tests/e2e/management-api.spec.ts:44`

The E2E server logs also show follow-on persistence errors while the mock Supabase backend is active. No Agents Server
code was changed here; this is a fresh reproduction of the already documented mock-filter issue, not a regression of
the `better-sqlite3` dependency update.
