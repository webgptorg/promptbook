# Agents Server E2E agents fail through a cyclic implicit Adam fallback

While verifying the self-contained Stalwart email-server integration, the Agents Server production build completed, but the Playwright suite failed when its first management API test agent was created.

## Failure

`POST /api/v1/agents` returned HTTP 500 for the deterministic source constructed in `tests/e2e/support/AgentManagementApi.ts`. The source has no explicit `FROM` commitment, so it uses the implicit Adam fallback. In the E2E environment, that fallback resolves to the same local URL twice:

```text
Cyclic `FROM` reference detected while resolving agent source.

Resolution chain:
- `http://127.0.0.1:4440/agents/adam`
- `http://127.0.0.1:4440/agents/adam`
```

The first failed agent creation is followed by cascading browser-test setup failures because later `loginAsAdmin` calls no longer find the desktop admin button. The final result was 14 failed and 5 passed tests; the failing tests are the management-agent/profile/chat scenarios.

## Scope

The email-server change does not modify inherited agent-source resolution or these E2E fixtures. Fixing the implicit Adam fixture/fallback is therefore intentionally left out of the email-server implementation.

Likely scoped remedies are to seed a non-recursive Adam agent in `mockSupabaseServer.cjs`, or make deterministic isolated test agents explicitly use `FROM VOID`.
