# Agents Server Performance Analysis & Fixes

## Root Cause Analysis

The Supabase Nano database was being overwhelmed by excessive queries coming from multiple sources. With 11,550+ DB requests in 60 minutes (and spikes causing unhealthy status), the problem was systemic — not a single bottleneck but a compounding effect of several design issues.

---

## Issues Found & Fixes Implemented

### 1. Middleware — Uncached DB Queries on Every HTTP Request (P0, CRITICAL)

**Problem:** The Next.js middleware (`src/middleware.ts`) ran on **every HTTP request** (matched by `/((?!_next/static|_next/image|favicon.ico|logo-|fonts/).*)`) and performed:

-   **Created a new Supabase client** on every request (no reuse)
-   **Queried `_Server` table** via `listRegisteredServers()` — bypassing the existing 10s cache in `listRegisteredServersUsingServiceRole()`
-   **Queried `${prefix}Metadata` table** for RESTRICT_IP, IS_EMBEDDING_ALLOWED, SERVER_VISIBILITY on every request

This meant every single page load, API call, polling request, and even robots.txt/sw.js generated 2-4 DB queries just from middleware.

**Fix:**

-   Replaced per-request Supabase client creation with a **cached singleton** (`cachedMiddlewareSupabase`)
-   Switched from `listRegisteredServers()` to `listRegisteredServersUsingServiceRole()` which has a **10s in-memory cache**
-   Added **30s in-memory cache** for metadata lookups (`MIDDLEWARE_METADATA_CACHE_TTL_MS = 30_000`)

**Impact:** Eliminates 2-4 DB queries per HTTP request → near-zero middleware DB load.

### 2. Admin Task Manager — 3s Polling with Heavy Queries (P1, HIGH)

**Problem:** The admin task manager UI (`/admin/task-manager`) polled at **3-second intervals** by default. Each poll:

-   Called `recoverExpiredRunningUserChatJobs()` — SELECT + potential UPDATEs
-   Called `recoverExpiredRunningUserChatTimeouts()` — UPDATE with RETURNING
-   Executed a heavy **UNION ALL** query joining UserChatJob + UserChatTimeout + User + Agent with `COUNT(*) OVER()`
-   Executed a separate **aggregate counters** query over the same UNION ALL

With one admin tab open: ~1.3 heavy DB operations per second, continuously.

**Fix:**

-   Increased default polling interval from **3s → 10s**
-   **Throttled recovery operations** to run at most once per 60 seconds (`ADMIN_RECOVERY_THROTTLE_MS = 60_000`) with deduplication
-   Recovery is still triggered on the first poll and then at most every 60s

**Impact:** ~70% reduction in admin poll DB load; recovery operations drop from every 3s to max every 60s.

### 3. Chat Stream SSE Polling — 500ms Polling During Active Jobs (P1, HIGH)

**Problem:** The user chat stream route (`/api/user-chats/:chatId/stream`) polled the database at:

-   **500ms** intervals when active jobs exist (2 queries per poll = 4 queries/sec per active chat)
-   **5s** intervals when idle

For a single user chatting: 4 DB queries/second sustained for potentially minutes.

**Fix:**

-   Increased active polling from **500ms → 1,500ms** (~1.3 queries/sec instead of 4)
-   Increased idle polling from **5s → 10s**

**Impact:** ~67% reduction in streaming DB load per active chat.

### 4. Vercel Cron — Every-Minute Timeout Worker (P1, MEDIUM-HIGH)

**Problem:** The Vercel cron job (`vercel.json`) triggered `/api/internal/user-chat-timeouts/run` **every minute** (`* * * * *`). Each invocation:

-   Calls `recoverExpiredRunningUserChatTimeouts()` — 1 query
-   Loops up to 20 times calling `claimNextDueUserChatTimeout()` — 1+ query each
-   Processes each claimed timeout with multiple DB queries

Even when idle (no pending timeouts), this generates at minimum 2 DB queries per minute.

**Fix:** Changed cron schedule from `* * * * *` to `*/5 * * * *` (every 5 minutes). The existing local wake-up timers (`scheduleUserChatTimeoutLocalWakeup`) already handle short-duration timeouts with sub-second precision, making the 1-minute cron redundant for active timeouts.

**Impact:** 80% reduction in cron-triggered DB queries.

### 5. Chat Job Heartbeat & Message Persist — High-Frequency Writes (P2, MEDIUM)

**Problem:**

-   **Heartbeat** ran every **5 seconds** during job execution → 12 UPDATE queries/minute per active job
-   **Assistant message persist** throttled at **500ms** intervals → up to 120 writes/minute during streaming

**Fix:**

-   Heartbeat interval increased from **5s → 15s** (4 writes/min instead of 12)
-   Message persist interval increased from **500ms → 2,000ms** (30 writes/min instead of 120)

The lease duration remains at 2 minutes, providing ample margin for 15s heartbeats.

**Impact:** ~75% reduction in per-job DB write load.

### 6. Agent Preparation Wait Polling (P3, LOW)

**Problem:** `waitForRunningAgentPreparation()` used a **250ms** polling interval, generating up to 10 DB queries per second while waiting for preparation to complete (max 2.5s timeout).

**Fix:** Increased polling interval from **250ms → 500ms** — still responsive but halves the DB load during waits.

---

## Issues Found But NOT Fixed (Future Work)

### 1. `handleChatCompletion` Double API Key Validation

The middleware validates the API key, and then `handleChatCompletion()` validates it again (`validateApiKey(request)`). This is an unnecessary redundant DB query. Fixing requires passing validation state through headers, which is a larger refactor.

### 2. `getMetadataMap` No Cross-Request Cache

`loadAllMetadataValues()` uses React's `cache()` which only deduplicates within a single server request. Every new API call re-queries the full Metadata table. Adding an in-memory TTL cache (similar to what was done for middleware) would help.

### 3. Admin UNION ALL Query Could Use Materialized Views

The task manager's UNION ALL over UserChatJob + UserChatTimeout with LEFT JOINs and COUNT(\*) OVER() is expensive. A materialized view or separate pre-aggregated counters table could improve performance for heavy admin usage.

### 4. `resolveCustomDomainAgent` Per-Request Query

Custom domain resolution queries the Agent table on each request for unrecognized hosts. This could be cached with a short TTL.

### 5. `runUserChatJob` Sequential Database Operations

The job runner performs ~15-20 database operations sequentially. Some could be parallelized (e.g., loading user data, checking tokens, loading agent context simultaneously).

### 6. `countActiveUserChatTimeoutsForChat` and `countCompletedUserChatTimeoutsForChatSince`

These count queries run for every timeout fire event. They could be cached or combined into a single query.

### 7. SSE Stream Could Use PostgreSQL LISTEN/NOTIFY

Instead of polling for chat updates, the stream route could subscribe to PostgreSQL change notifications, eliminating polling entirely. This is a significant architectural change.

### 8. Connection Pooling

Consider using PgBouncer or Supabase's connection pooler more aggressively to reduce connection overhead.

---

## Estimated Total Impact

| Source                        | Before (queries/min idle) | After (queries/min idle) | Reduction |
| ----------------------------- | ------------------------- | ------------------------ | --------- |
| Middleware (10 req/min)       | 20-40                     | 0-2                      | ~95%      |
| Admin poll (1 tab open)       | 80+                       | 24                       | ~70%      |
| Cron job                      | 2+                        | 0.4                      | ~80%      |
| Active chat stream (1 user)   | 240                       | 80                       | ~67%      |
| Job heartbeat+persist (1 job) | 132                       | 34                       | ~74%      |
| **Total (typical idle)**      | **~340+**                 | **~60**                  | **~82%**  |

These changes should bring the Supabase Nano database well within its limits for normal operation.
