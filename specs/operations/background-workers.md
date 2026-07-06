# Background Workers

Background workers advance durable chat jobs, chat timeouts, and runner synchronization without requiring a browser request to stay open.

## Authentication

Internal worker routes require:

```http
x-user-chat-worker-token: <secret>
```

The secret comes from `PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN`. See [Authentication](../authentication.md).

Worker routes MUST reject missing or invalid tokens. Production deployments MUST configure the token explicitly.

## Routes

Important internal worker routes:

- `/api/internal/user-chat-jobs/run`
- `/api/internal/user-chat-timeouts/run`
- `/api/internal/agent-runner-limits`

These routes are excluded from normal middleware matching but still enforce their own shared-secret checks.

## User Chat Job Tick

A user-chat job tick MUST:

1. Recover expired `RUNNING` jobs.
2. Claim a preferred queued job when requested, otherwise claim the next queued job.
3. Process the job through the configured local, external, or in-process runner path.
4. Schedule another tick when a mutation indicates more immediate work is available.
5. Return `204` when no work was performed.

The job route supports `GET` and `POST`. `POST` MAY accept:

```json
{
  "preferredJobId": "job-id"
}
```

## Job Claiming

Claiming MUST be concurrency-safe:

- Only `QUEUED` jobs are claimable.
- A claim changes status to `RUNNING`.
- `startedAt`, `lastHeartbeatAt`, and `leaseExpiresAt` are set.
- `attemptCount` increments.
- `failureReason` is cleared.
- Competing workers cannot claim the same job.

The default lease duration is 10 minutes.

## Expired Jobs

Expired `RUNNING` jobs are jobs whose lease has passed. Recovery MUST mark them failed with diagnostic failure details and update the associated chat state.

## Local Runner Processing

Local runner processing uses the filesystem contract described in [User Chats](../user-chats.md).

Runner limits include:

- maximum failed attempts
- maximum parallel local messages

These limits are configured through [Server Limits](../configuration.md#server-limits).

## External Runner Processing

External runner processing uses a GitHub-backed repository file contract. It SHOULD preserve the same queued/finished/failed message semantics as the local runner.

## Timeout Worker Tick

`/api/internal/user-chat-timeouts/run` runs due timeout processing.

Timeout worker behavior:

- Claim due queued timeouts.
- Set a short lease while running.
- Execute timeout action by appending or scheduling chat work.
- Mark completed, failed, or cancelled.
- Reschedule recurring timeouts when recurrence is configured.
- Respect active and fired-per-day limits.

The timeout lease duration is shorter than chat job leases and is intended for quick actions.

## Scheduling

API routes that enqueue jobs or timeouts SHOULD trigger worker ticks using server-side after-response scheduling when supported.

A deployment MAY also use cron or an external scheduler. The scheduler MUST call the same internal routes with the worker token.

