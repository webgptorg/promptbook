# Project service API

[Main specification](../_main.md) · [Shared controls](controls.md) · [Remote access](remote-access.md)

The active project engine exposes an independently usable HTTP API for inspecting and controlling its runtime. It works without a browser app or terminal dashboard; zero, one or many clients can use it. The engine owns all scheduling, lifecycle and recovery logic. Neither a client nor server-side page rendering starts a separate queue or owns the service.

Start enables local HTTP in either process mode, binding to loopback on a free port or explicit `--port`; report actual address/conflicts. Protected remote tunnelling is enabled by default under [remote policy](remote-access.md), without changing local binding. No-tunnel leaves local HTTP; no-server disables HTTP, browser app and tunnel, but not local engine control/discovery. For finite run, enabled server/tunnel belong to that invocation and do not keep it alive after completion.

## State and controls

Expose authenticated structured project identity, actual engine version, instance/freshness information, the four live [service states](service-lifecycle.md), pending intent, current agent/task, phase, queue/details, results/statistics, waits, blockers, errors, links, effective settings and commit mode. An exited/unreachable engine is not an invented live `stopped` state. Clients cannot infer successful shutdown from a broken connection alone.

Supply actual effective harness, model and thinking level per relevant execution/consultation context, with unknown/default/not-applicable distinctions. Supply authorized browser inspection data: effective profile source/resolved path, mode, ownership/health, redacted failure and recovery status. This supports [collapsed diagnostic panels](dashboard-details.md) without forcing verbose default UI. Include verified local/remote address/provider/health; clients never guess ports. Ordinary state excludes pairing secrets, device/API credentials and browser-profile contents.

Expose pause, resume/cancel pending pause/stop, changing drain intent, graceful stop, explicit force stop and restart through the same engine operations as CLI/dashboard. Apply the state-machine confirmation and stale-request rules, including stop-to-pause replacement. A request accepted as `stopping` is not a completed shutdown. Never independently implement task scheduling or force termination in each client.

Also expose real pacing/backoff wait skipping, browser diagnostic recheck/startup retry/restart, chat operations and allowed settings changes. Browser repair shares automatic recovery's ownership/session-safety contract. Report active, pending-safe-boundary, restart-required, completed, failed and unconfirmed outcomes accurately. Saving versioned defaults uses [operation persistence](git-persistence.md); runtime-only mutations create no commits. No save/action is complete before application and any required commit.

## Chat and creation

Chats expose their full name, participants, actual authors, status, timestamps, history and task/conversation links. Provide authenticated list/new/open/append/answer actions using durable Book sources and normalized names, not chat IDs. A new human-chat request without a target selects [Chatter](../agents/chatter.md); explicit targets and existing-thread participants remain unchanged. Invalid/missing Chatter is diagnosed rather than silently replaced. A human answer is a committed message, not runtime-only request resolution.

Use idempotent mutation/revision checks to prevent duplicate accepted messages or actions from stale/reconnecting clients. Expose canonical agent identity/observed activity for [visual presentation](../agents/visual-identity.md), without inventing execution. Distinguish user-waiting threads from automatic work and internal specialist consultations.

New task/chat creation follows [generated-name policy](generated-names.md): typed opening commitment, readable creation date/time and normalized collision prevention. Return the final full name and actual reference/path; clients do not append timestamps or address preliminary titles. A retried creation reconciles its original prepared entity rather than creating another. Existing names remain unchanged on reads/appends/recovery, including valid undated Books. Task trace paths are returned from the [source-filename mapping](traces.md), not reconstructed from entity-name normalization by clients.

## Client independence and security

Clients obtain fresh engine state and observe mutations from every other channel. Inspection is read-only. All writes obey ownership, source revision, task, configuration and recovery contracts. Serve SPA/assets and API through the same local/public origin, using compatible live updates; SSE alone is insufficient for a provider that does not support it. Runtime API responses require neither HTML forms nor server-rendered fragments.

Protect inspection as well as mutations before tunnelling. Unauthenticated clients receive only minimal pairing/app-shell information, not project content or control. Use project-scoped session/direct-client authorization under remote access. Reject unauthorized cross-origin requests, stale edits, invalid input and access outside the project. Hostname opacity, forwarded headers or apparent localhost origin are not authorization. Prevent shared caching of authenticated data/credentials. Never expose tokens, cookies, profile contents or unredacted diagnostics; a profile path is not permission to read its contents.

Client/tunnel failures do not stop a daemon, duplicate tasks or reset state. The lightweight [browser dashboard](dashboard.md) remains a consumer at `/`. Host-wide [discovery](global-dashboard.md) is a separate local inventory contract, not a project API that silently gains authority over every engine.
