# Agents Server overload analysis

## Scope analyzed

-   Durable user-chat flow in `apps/agents-server`
-   Canonical chat refresh and stream polling
-   Durable chat-job claiming and worker wake-ups
-   Agent preparation and agent-runtime warmup
-   Planned agent events via `USE TIMEOUT`
-   Recursive agent-source resolution paths

## Confirmed root causes

### 1. Canonical chat polling was doing repeated database work even when chats were idle

The largest load amplifier was the durable chat UI refresh model:

-   `AgentChatHistoryClient.tsx` kept opening the canonical chat stream for the active chat whenever history was enabled.
-   The client also triggered periodic `refreshActiveChat()` calls even while the stream was healthy.
-   The stream route `/api/user-chats/[chatId]/stream` kept polling even after the chat became idle.
-   Every stream poll and every manual refresh went through `getUserChat()` plus `createUserChatDetailPayload()`, which also loads active jobs and active timeouts.

This meant one idle open chat could keep generating steady reads with no user activity, and active chats multiplied that load further.

### 2. Claiming the next queued durable chat job used a multi-request optimistic flow

`claimNextQueuedUserChatJob.ts` previously:

-   selected queued candidates
-   loaded up to 20 rows
-   tried updates one by one until one claim succeeded

Under concurrency this increased round-trips and contention on the hottest queue path.

### 3. Agent preparation added avoidable latency and extra reads to normal chats

`waitForRunningAgentPreparation()` waited for scheduled preparation rows by polling the database, even when the preparation was only due and not actually running yet.

That had two bad effects:

-   extra reads on the preparation table
-   slower chat startup because requests waited instead of immediately continuing or kicking the worker

### 4. Server-side runtime caches were too short or effectively disabled

-   `$provideAgentCollectionForServer()` had caching intentionally disabled.
-   Resolved server-agent context and model-requirements caches lived only 30 seconds.
-   The agent-reference resolver cache also lived only 30 seconds.

This caused repeated warmups of expensive agent-resolution and preparation paths across otherwise similar requests.

### 5. Hottest chat/timeout scans were missing targeted indexes

The code frequently filters and orders by:

-   `UserChatJob.status`, `cancelRequestedAt`, `chatId`, `userId`, `agentPermanentId`, `createdAt`, `leaseExpiresAt`
-   `UserChatTimeout.status`, `pausedAt`, `chatId`, `userId`, `agentPermanentId`, `dueAt`, `createdAt`, `leaseExpiresAt`

Those access patterns needed dedicated partial indexes for active/running rows.

## Investigated and ruled out as primary root cause

### `USE TIMEOUT` implementation

The planned agent events path is not implemented as a tight permanent poll loop:

-   short timeouts use best-effort local wake-ups
-   durable execution goes through `userChatTimeoutWorker`
-   the worker prevents overlapping ticks and only claims due rows

It still performs several reads/writes per fired timeout, but it was not the main source of the sustained background overload.

### Infinite or recursive loops in agent-source resolution

I reviewed the inherited/imported agent-source flow and did not find an infinite recursion bug in the current path:

-   `resolveInheritedAgentSource.ts` has explicit cycle detection for `FROM`
-   imported/inherited references are tracked and bounded

This area is expensive when caches are cold, but it was not the crash trigger here.

## Fixes implemented

### 1. Stopped idle durable chats from continuously polling

Changed `apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx`:

-   open the canonical stream only while the active chat has active durable jobs
-   stop doing the old unconditional periodic healthy-stream refresh
-   when only timeouts are pending, refresh near the next due timeout instead of continuously
-   keep the faster retry loop only for disconnected active-job streams

Changed `apps/agents-server/src/app/agents/[agentName]/api/user-chats/[chatId]/stream/route.ts`:

-   stop the server-side polling loop as soon as the chat no longer has active jobs

Result: idle open chats stop generating continuous stream traffic and repeated detail reloads.

### 2. Made durable chat-job claiming atomic

Changed `apps/agents-server/src/utils/userChat/claimNextQueuedUserChatJob.ts`:

-   replaced select-then-update claiming with one raw SQL statement
-   use `FOR UPDATE SKIP LOCKED`
-   claim and transition one row to `RUNNING` in a single round-trip

Result: less queue contention, fewer DB requests, and better worker behavior under concurrency.

### 3. Reduced agent preparation waiting on the hot chat path

Changed `apps/agents-server/src/utils/agentPreparation.ts`:

-   reduced chat wait timeout from `2500ms` to `500ms`
-   reduced poll interval from `500ms` to `200ms`
-   when preparation is only `SCHEDULED` and already due, kick the worker and return immediately instead of polling for it to start

Result: chat startup waits less and performs fewer preparation-table reads.

### 4. Increased reuse of expensive server-agent runtime work

Changed `apps/agents-server/src/tools/$provideAgentCollectionForServer.ts`:

-   cache `AgentCollectionInSupabase` per `tablePrefix` instead of rebuilding it repeatedly

Changed `apps/agents-server/src/utils/cachedServerAgentRuntime.ts`:

-   increased resolved context cache TTL from `30s` to `5m`
-   increased model-requirements cache TTL from `30s` to `5m`

Changed `apps/agents-server/src/utils/agentReferenceResolver/$provideAgentReferenceResolver.ts`:

-   increased resolver cache TTL from `30s` to `5m`

Result: repeated chats and agent requests stop redoing the same warmup work so often.

### 5. Added indexes for active chat-job and timeout worker paths

Added migration `apps/agents-server/src/database/migrations/2026-03-0300-user-chat-performance-indexes.sql`:

-   active `UserChatJob` chat-scope index
-   running `UserChatJob` lease-expiry index
-   active `UserChatTimeout` chat-scope/due-time index
-   running `UserChatTimeout` lease-expiry index

Result: lower cost for the most common active/running scans.

## Things found but not fixed yet

### 1. `createUserChatDetailPayload()` still fans out into multiple reads

The canonical detail payload still loads chat, active jobs, and active timeouts through separate paths. It works, but it remains one of the most expensive read paths and could be consolidated later into one SQL/RPC shape.

### 2. Timeout execution still performs several sequential DB operations per fired timeout

The current `USE TIMEOUT` flow is correct and bounded, but each fired timeout still does multiple reads/writes before and after it enqueues the wake-up job. That can be optimized further later.

### 3. Runtime caches are process-local only

The new `5m` caches improve hot-path latency significantly, but they do not provide cross-instance invalidation. A shared cache or explicit invalidation channel would let this be more aggressive safely.

### 4. Admin task-manager queries are still relatively expensive when used heavily

The current crash path was not primarily the admin UI, but its query shape is still non-trivial. If this page is used heavily, it deserves its own optimization pass.

### 5. SSE polling could eventually be replaced entirely

The current changes greatly reduce polling, but the best long-term solution is event-driven updates such as PostgreSQL `LISTEN/NOTIFY`, Supabase Realtime, or a server-side broadcast channel.

### 6. Multi-tab chat usage can still multiply some read traffic

The main idle polling issue is fixed, but several open tabs still duplicate some refresh work. A browser-side shared channel could coordinate canonical state across tabs later.

## Expected impact

The biggest expected gains are:

-   substantially fewer background reads from idle durable chat tabs
-   fewer DB round-trips in the queue-claim hot path
-   faster chat preparation on repeated or recently used agents
-   lower CPU and query cost on active/running chat-timeout scans

The server should now stay healthier under low and medium traffic, and chat response startup should be noticeably faster.
