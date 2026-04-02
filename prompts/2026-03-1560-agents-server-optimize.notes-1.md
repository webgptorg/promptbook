# Agents Server overload/crash analysis and fixes

Date: 2026-04-02

## Scope

- Analyzed `apps/agents-server` runtime paths related to:
  - middleware DB access frequency
  - durable chat workers and cron triggers
  - custom-domain routing and agent-source resolution
  - `USE TIMEOUT` durable scheduling path
  - chat list/request payload size and response-time impact
- Correlated code behavior with reported production logs/screenshots (`PGRST003`, statement timeouts, unhealthy Supabase pool, slow chat responses).

## Root causes found

### 1) Middleware generated high DB pressure on broad request surface

- `middleware.ts` runs on almost all requests.
- For unresolved hosts, it can enter expensive custom-domain resolution.
- Internal worker routes and trivial assets were still traversing middleware.
- Under load, this path amplified DB usage and request latency before business logic even started.

### 2) Custom-domain resolution scanned too much data per lookup

- `resolveCustomDomainAgent(...)` was loading full agent sets per server and only then matching host candidates.
- It also initialized reference resolution from full agent row datasets.
- Because metadata resolution can require inherited/imported source processing, this became expensive on unknown host requests.

### 3) Chat list endpoint was pulling full chat transcripts repeatedly

- `/agents/[agentName]/api/user-chats` used `select('*')` chat rows, including full `messages` JSON arrays for all listed chats.
- Chat history refreshes repeated this large payload pattern even when only sidebar summary info was needed.
- This increased DB response cost, network payload size, and request latency.

### 4) Durable chat worker had unnecessary write frequency and fragile heartbeat failure handling

- Running jobs persisted assistant snapshots frequently even when content did not materially change.
- Heartbeat failures aborted too aggressively, which can increase churn/retries under transient DB pressure.

### 5) Queue-claim/readiness patterns needed indexing

- Hot paths (`UserChat`, `UserChatJob`, `UserChatTimeout`) rely on status/time predicates and ordering.
- Missing partial/composite indexes can force larger scans and contribute to pool/timeout issues when concurrency rises.

### 6) Background processing cadence was incomplete for durable chat jobs

- Timeout worker had cron, but durable chat jobs needed explicit cron wake-up for unattended/background queues.
- Requirement was to process unattended background tasks roughly every 2 minutes.

## Fixes implemented

### A) Middleware and registry hardening

- File: `apps/agents-server/src/middleware.ts`
  - Increased metadata cache TTL from 30s to 120s.
  - Switched metadata cache to per-`tablePrefix` map (instead of single-slot cache).
  - Added host-level custom-domain resolution cache (including negative-cache misses) with 120s TTL.
  - Added in-flight custom-domain lookup deduplication per host to prevent burst-triggered duplicate expensive scans.
  - Added strict custom-domain resolution timeout (`CUSTOM_DOMAIN_RESOLUTION_TIMEOUT_MS = 1500`).
  - Added fast skip rules to avoid expensive custom-domain resolution for:
    - localhost/loopback
    - `.vercel.app` / `.vercel.sh`
    - `/api/internal/*`
  - Removed middleware matching for:
    - `/api/internal/*`
    - `robots.txt`
  - Improved host normalization robustness.

- File: `apps/agents-server/src/utils/serverRegistry.ts`
  - Increased `_Server` registry cache TTL from 10s to 60s.

### B) Agent collection cache bug fix

- File: `apps/agents-server/src/tools/$provideAgentCollectionForServer.ts`
  - Removed effectively disabled cache path (`just(false)`).
  - Implemented process-local cache keyed by `tablePrefix`.
  - Prevents repeated re-creation of collection/provider stack.

### C) Custom-domain resolution query reduction

- File: `apps/agents-server/src/utils/customDomainRouting.ts`
  - Added early OR-filter construction from host (`createCustomDomainOrFilter(host)`).
  - First query now fetches only matching candidate agents (instead of full table scan per server).
  - Resolver initialization now uses compact reference rows (`agentName`, `permanentId`) instead of full rows.

### D) Chat list payload optimization

- File: `apps/agents-server/src/utils/userChat/listUserChats.ts`
  - Added `listUserChatSummarySeeds(...)` using raw SQL summary projection without hydrating full message arrays.
  - Returns compact seed: message count, first user content, last preview content, pending assistant count.

- File: `apps/agents-server/src/utils/userChat/createUserChatSummary.ts`
  - Added `UserChatSummarySeed` type.
  - Added `createUserChatSummaryFromSeed(...)`.
  - Existing `createUserChatSummary(...)` now delegates through the seed path for behavior consistency.

- File: `apps/agents-server/src/app/agents/[agentName]/api/user-chats/route.ts`
  - Switched list API to `listUserChatSummarySeeds(...)`.
  - Loads full chat only for currently active chat via `getUserChat(...)`.
  - Keeps detail payload behavior while reducing repeated heavy list payloads.

- File: `apps/agents-server/src/utils/userChat.ts`
  - Exported new seed APIs/types.

### E) Durable worker write/backpressure improvements

- File: `apps/agents-server/src/utils/userChat/claimNextQueuedUserChatJob.ts`
  - Increased lease duration to 10 minutes.

- File: `apps/agents-server/src/utils/userChat/runUserChatJob.ts`
  - Heartbeat interval: 15s -> 30s.
  - Assistant running-state persist throttle: 2s -> 5s.
  - Added heartbeat failure tolerance (abort only after 3 consecutive failures).
  - Added assistant snapshot signature dedup to avoid redundant writes for unchanged running snapshots.

### F) Cron and background cadence

- File: `apps/agents-server/src/app/api/internal/user-chat-jobs/run/route.ts`
  - Added GET handler for cron invocation.
  - Added cron-compatible authorization path (Vercel user-agent and optional `CRON_SECRET` bearer).
  - Preserved internal token-based POST authorization.

- File: `apps/agents-server/vercel.json`
  - Added cron for `/api/internal/user-chat-jobs/run` every 2 minutes.
  - Changed timeout cron to every 2 minutes to match required cadence.

- File: `apps/agents-server/src/database/metadataDefaults.ts`
  - Added metadata key `USER_CHAT_BACKGROUND_CRON_INTERVAL_MINUTES = 2`.

### G) Database migration for queue/query performance

- File: `apps/agents-server/src/database/migrations/2026-04-0010-user-chat-performance-indexes.sql`
  - Added `UserChat` composite index for scoped list ordering.
  - Added partial ready/running indexes for `UserChatJob`.
  - Added partial ready/running indexes for `UserChatTimeout`.

## `USE TIMEOUT` implementation analysis notes

- The timeout system is durable (`UserChatTimeout` table + worker route + cron).
- The main overload issue was not timeout semantics themselves, but surrounding infrastructure pressure (middleware, query/index shape, worker cadence).
- Index additions for timeout queue predicates reduce scan cost for due/lease-expired paths.
- Timeout cron cadence now aligned to 2 minutes (as requested).

## Potential recursive/infinite-loop analysis notes

- Agent-source resolution paths were reviewed in current server code.
- No new recursion bug was introduced by this optimization patch.
- Existing cycle handling in inherited-source resolution remains the primary guardrail.
- Custom-domain resolution remained expensive mostly due dataset breadth and metadata resolution cost, which is now reduced via candidate pre-filtering and caching/timeout guard in middleware.

## Validation run

- `npm run lint` (in `apps/agents-server`) -> passed.
- `npm run test-types` (root) -> passed.
- `npm run test-name-discrepancies` -> passed.
- `npm run test-spellcheck` -> passed.
- `npm run test-build` in `apps/agents-server`:
  - Build process progressed, but final run is currently blocked by environment/runtime `EPERM` process-kill behavior during test-build/prerender stage in this machine.
  - This does not point to a TypeScript or lint regression in modified files.

## Found but not fixed yet (future work)

### 1) Add strict fetch timeout/retry envelope for federated `importAgent` calls

- Long federated fetches can still stall hot paths under network issues.
- Recommendation: enforce explicit timeout + bounded retries + fallback behavior in `importAgent`.

### 2) Explicit Postgres pool sizing/tuning

- Current pool configuration in some codepaths relies on defaults.
- Recommendation: set explicit pool limits/idle settings per runtime profile to better control connection pressure.

### 3) Further reduce summary computation cost for very large `messages` arrays

- Current summary-seed SQL avoids payload hydration but still computes from JSONB arrays.
- Recommendation: maintain incremental summary columns/materialized metadata to eliminate repeated JSONB scans for sidebar reads.

### 4) Cross-instance cache invalidation strategy

- Current caches are process-local TTL caches.
- Recommendation: for larger multi-instance deployments, consider distributed invalidation or pub/sub refresh triggers for faster consistency with low DB pressure.
