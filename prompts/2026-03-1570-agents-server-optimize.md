# Agents Server optimization analysis

## Scope

-   Analyzed `apps/agents-server` request paths, background workers, agent-source resolution, cron usage, and the `USE TIMEOUT` implementation.
-   Focused on overload/crash causes without changing user-facing functionality.
-   No database migration was needed for the fixes below.

## Root causes found

### 1. Constant background polling was generating steady DB load

-   `userChatTimeoutWorker.ts` was running a 5-second in-process polling loop after the timeout worker was bootstrapped.
-   `agentPreparation.ts` was also running its own 5-second in-process polling loop once any preparation prefix became active.
-   On a serverless / multi-instance deployment, these loops multiply across warm runtimes and keep issuing database queries even when the server is mostly idle.
-   This matches the observed steady Supabase request graph: roughly constant DB traffic even under low real user traffic.

### 2. Agent-source cycle detection missed canonical-vs-name URL aliases

-   Recursive resolution was tracking only one current-agent URL in the lineage.
-   In practice, the same agent can appear as:
    -   `/agents/<permanentId>`
    -   `/agents/<agentName>`
-   Explicit `FROM https://.../agents/<name>` and `IMPORT https://.../agents/<name>` references could therefore bypass cycle detection when the currently resolved agent was tracked only by canonical permanent-id URL.
-   The logs showing `/agents/recursive-0/api/book` and `/api/agent-organization` timing out are consistent with this bug.

### 3. `USE TIMEOUT` depended on cron for long wake-ups, but cron calls were failing

-   The Vercel logs show repeated `GET /api/internal/user-chat-timeouts/run` with `401`.
-   That means long-running timeout wake-ups were not reliably backed by cron and the server was leaning on in-process polling instead.
-   This made the timeout system less reliable and increased pressure on the DB.

### 4. Resolver cache churn was causing extra repeated agent-list loads

-   `$provideAgentReferenceResolver` had only a 5-second TTL.
-   Rebuilding the resolver reloads the full local agent list.
-   The cache also was not invalidated on normal create/update writes, so the TTL had to stay short.

## Fixes implemented

### A. Removed steady 5-second worker polling

-   Converted the timeout worker to event-driven behavior:
    -   kept explicit worker ticks
    -   kept short local wake-up timers
    -   removed the always-on 5-second interval
-   Converted agent preparation to event-driven behavior:
    -   kept one-shot wake-up timers
    -   kept on-demand kicks
    -   removed the always-on 5-second interval
-   Result:
    -   idle runtimes stop polling Supabase every few seconds
    -   DB traffic should drop substantially under low traffic

### B. Rescheduled timeout wake-ups after edits / retries

-   Added `notifyUserChatTimeoutScheduleChanged(...)`.
-   Called it after timeout mutations that can change scheduling:
    -   timeout edit route
    -   timeout tool adapter updates
    -   bulk pause/resume actions
    -   admin retry route
-   This keeps short in-process wake-ups aligned without reintroducing global polling.

### C. Re-enabled Vercel cron execution for timeout wake-ups

-   Allowed the timeout worker route to accept Vercel cron `GET` requests identified by `user-agent: vercel-cron/...`.
-   Internal `POST` worker calls remain protected by the internal token.
-   Result:
    -   long timeout wake-ups can be processed by cron again
    -   the system no longer needs the old constant polling loop just to stay functional

### D. Hardened cycle detection for agent-source resolution

-   Added `currentAgentAliases` to inherited-source resolution.
-   Propagated equivalent current-agent URLs through:
    -   stored-agent resolution
    -   server agent context resolution
    -   route/book-scoped agent resolution
-   The lineage now treats canonical permanent-id URLs and name-based URLs as the same logical node for cycle detection.
-   Added a regression unit test covering the alias-based self-cycle case.

### E. Reduced resolver rebuild churn

-   Increased `$provideAgentReferenceResolver` cache TTL from 5 seconds to 30 seconds.
-   Invalidated the resolver cache on normal agent create/update writes in `attachAgentPreparationScheduling.ts`.
-   Result:
    -   fewer repeated full-agent-list loads
    -   lower background DB pressure during normal server activity

## Files changed

-   `apps/agents-server/src/utils/userChatTimeout/userChatTimeoutWorker.ts`
-   `apps/agents-server/src/utils/userChatTimeout.ts`
-   `apps/agents-server/src/utils/userChatTimeout/agentScopedTimeoutBulkActions.ts`
-   `apps/agents-server/src/tools/configureTimeoutToolRuntimeAdapterForServer.ts`
-   `apps/agents-server/src/app/agents/[agentName]/api/timeouts/[timeoutId]/route.ts`
-   `apps/agents-server/src/app/api/admin/chat-tasks/[taskId]/retry/route.ts`
-   `apps/agents-server/src/app/api/internal/user-chat-timeouts/run/route.ts`
-   `apps/agents-server/src/utils/agentPreparation.ts`
-   `apps/agents-server/src/utils/resolveInheritedAgentSource.ts`
-   `apps/agents-server/src/utils/resolveAgentStateFromSource.ts`
-   `apps/agents-server/src/utils/resolveStoredAgentState.ts`
-   `apps/agents-server/src/utils/agentReferenceResolver/bookScopedAgentReferences.ts`
-   `apps/agents-server/src/utils/resolveServerAgentContext.ts`
-   `apps/agents-server/src/utils/agentReferenceResolver/$provideAgentReferenceResolver.ts`
-   `apps/agents-server/src/utils/attachAgentPreparationScheduling.ts`
-   `apps/agents-server/src/utils/resolveInheritedAgentSource.test.ts`

## Validation performed

-   `npx jest apps/agents-server/src/utils/resolveInheritedAgentSource.test.ts --runInBand`
-   `npm run test-types`
-   `(cd apps/agents-server && npm run lint)`

## Things found but not fixed yet

### 1. `CRON_SECRET` should still be configured

-   The new cron fallback restores functionality for Vercel cron `GET` requests, but an explicit `CRON_SECRET` is still the cleaner long-term setup.
-   Recommended follow-up: configure `CRON_SECRET` in the deployment environment and keep the fallback only as a safety net or remove it later.

### 2. Resolver cache invalidation is still incomplete for all write paths

-   Create/update writes now invalidate the resolver cache.
-   Delete/restore/direct SQL mutation paths are not all wired into the same invalidation yet.
-   Recommended follow-up: centralize agent-mutation invalidation so every agent/folder mutation updates resolver-related caches consistently.

### 3. `/api/agent-organization` is still expensive on large installations

-   It still resolves stored agent state on demand.
-   The recursion bug is fixed, but the route can still be heavy when there are many agents with inherited/imported sources.
-   Recommended follow-up:
    -   cache resolved organization payloads
    -   or persist precomputed resolved profile metadata
    -   or reuse agent-preparation outputs for organization/profile routes

### 4. Admin task manager can still generate intentional DB load

-   The admin task manager auto-refreshes frequently and also runs recovery logic.
-   This is not the root-cause overload, but it is still a source of extra queries while the dashboard is left open.
-   Recommended follow-up: debounce or slow down admin polling when the page is in the background.

### 5. Full app test suite is currently blocked by an unrelated `/restricted` prerender issue

-   `npm run test-app-agents-server` currently fails after the successful build step because `/restricted` uses `headers()` during static rendering.
-   Reported runtime error: `Dynamic server usage: Route /restricted couldn't be rendered statically because it used headers`.
-   This is not caused by the overload/stability patch above, but it should be fixed separately so the full app suite becomes green again.
