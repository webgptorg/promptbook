# Project service API

[Main specification](../_main.md) · [Shared controls](controls.md)

The active engine exposes an independently usable authenticated HTTP API for project inspection/control. It requires neither browser app nor terminal dashboard. Zero, one or many clients use the same scheduling, lifecycle, management and recovery operations; neither clients nor page rendering create another worker.

This file specifies the **existing local API surface**. The target remote App's first-release scope is defined in [App integration](../app/integration.md), and its transport is the [App connection](../app/connection.md): relay tunnels carrying encrypted browser TLS that the engine ends itself, using the same domain operations without publishing this local listener. The App need not reproduce every local editor or management operation. Its shared task model includes engine-defined system tasks and separate task runs; transport IDs, rename mapping and concrete schemas remain a joint contract decision, without changing Book-name identity by assumption.

Start enables loopback HTTP in either process mode on a free or explicitly selected port and reports actual address/conflicts. No-server disables HTTP/SPA but not local engine control/discovery. No provider is contacted and no software is installed to expose the dashboard.

## Observed state and shared operations

Expose project identity, actual engine version, instance/freshness, four live [service states](service-lifecycle.md), pending intent, concurrent task/agent/phase collection, selected detail, actual resource waits/queue, results, waits/errors, links, configuration revision/effective sources and commit mode. Resource waits and failed synchronization are not new lifecycle states. An unreachable engine is not proof of a completed stop.

Execution data includes actual named tool, harness variant, model/thinking level and attempt/consultation attribution, with unknown/unsupported distinctions. Tool inventory includes canonical saved records, enabled/usability/in-use state and retained old uses distinct from new defaults. Authorized browser diagnostics identify each named instance's profile source/resolved path, mode, ownership/health and redacted recovery outcome. Ordinary state never exposes cookies, profile contents, resolved API keys or local client credentials.

Expose lifecycle controls, real pacing wait skipping, per-browser diagnosis/recheck/retry/restart, chat operations and supported settings changes. Apply shared stale-request/confirmation rules, including replacing pending stop with pause. Distinguish accepted, pending safe boundary, applied, committed, failed, unconfirmed and restart-required outcomes. Expose saved-to-file and pending/committed Git separately; immediate-commit operations retain that requirement.

## Shared saved tool management

Expose the same list/show/add/modify/reorder/enable/disable/remove operations as [tool CLI/dashboard management](tool-management.md), using the [single typed domain contract](../coding-standards/shared-logic.md), not API-specific validators or Git writes. Saved tool changes commit their authorized versioned configuration immediately and notify live consumers; a running task may use a newly added resource. Preserve other clients' edits, task ownership and operation isolation.

In-use and last-enabled-type protections return explicit decision requirements and revalidate them when applying an acknowledgement. An acknowledgement to retain active work is not a kill request. The emergency route invokes the existing whole-engine force-stop operation; removing a tool remains a separate operation after confirmed stop. Do not add a tool-removal force-stop shortcut. Browser restart/kill/test-tab are separate runtime operations on the shared profile pool, showing effects on all connected engines.

Credential references are readable, actual credentials are not. Where adding a secret is authorized, use a protected write-only input that calls the shared [environment editor](environment.md), with timestamped non-destructive audit and no echoed value in response/error/logs. Do not treat general configuration field writes as permission to read arbitrary environment variables or edit files outside project authority.

## Report and project inspection

Expose the shared saved [brief](project-report.md), original time and actual availability/persistence/generation state, without calling Chatter on read. Explicit Refresh coalesces scheduled work subject to task pause and actual resource availability. Discuss creates a new normal chat seeded with the displayed snapshot/provenance and ordinary first-User-message MODEL routing.

Expose bounded read-only External activity log, [History](history.md) and [Files](files.md), actual verified task/chat/evidence links and honest missing history. Confine files, hide protected/secret paths and sanitize untrusted content. Book viewing/editing shares one long-document model, without whole-history responses each refresh. Retain current local authentication/origin boundaries; add no remote transport. Desktop file writes use authenticated engine operations with preflight, revision/ownership checks, per-operation results and explicit local persistence state under the [desktop Files contract](files.md#desktop-text-editing-and-bulk-operations).

## Wallet and encryption boundary

Expose nonsecret Wallet readiness, service/account labels and pending action/result state. Protected owner operations submit credentials and recovery words through concealed write-only input under [Wallet](wallet.md) and [project encryption](project-encryption.md); ordinary status, chat/source export and agent APIs never return them. Agent requests authorize a specific browser login, not raw decryption. Apply project authentication, origin/scope checks, redaction and once-only persistence to these operations; never log request bodies containing secrets. Share one implementation across terminal/browser/API.

## Synchronization

Expose effective autosync enablement and, when enabled, redacted origin/tracking destination, real attempt/integration/publication status, pending/deferred work, errors and next retry. Provide one-cycle manual synchronization through the shared [coordinator](git-synchronization.md). Coalesce overlapping requests, preserve active work and report actual outcomes rather than pretending an accepted request has completed. A disabled policy does not silently become enabled by a stale manual-cycle request. Clients omit the dedicated panel while off.

Network/rejected-push failures do not stop safe local execution or create duplicate result commits. The API observes this policy; it does not implement its own pull loop or merge strategy.

## Chat and creation

Chats expose full names, participants/authors, status/timestamps, history and task/conversation links. Authenticated list/new/open/append/answer use durable Books and normalized names, not new chat IDs. A new human-chat request with no target selects [Chatter](../agents/core-agents/chatter.md); existing-thread participants and explicit targets remain unchanged. Missing/invalid Chatter is diagnosed, not silently replaced. Human answers are promptly saved messages with bounded Git batching; clear their question's attention on accepted save.

Use revision/idempotency checks against stale/reconnecting duplicate writes. Expose canonical agent identity/observed activity for [visual presentation](../agents/visual-identity.md). Distinguish actionable human waits from ordinary internal specialist consultations; Fixer uses these normal agent mechanisms, not a special transport.

Task/chat creation follows [generated names](generated-names.md): opening kind/name, readable creation date/time and normalized collision prevention. Return the final name and actual reference/path rather than asking clients to append timestamps. Retry reconciles the prepared entity instead of creating another. Existing undated names remain unchanged by append/read/recovery. Task trace paths come from [source-filename mapping](traces.md), not client guesses from names.

Expose evolving titles separately from stable opening names, multiple declared participants, progress/final phases and elapsed Thinking data. Accept follow-up input during work with ordered replay/live updates. Expose live task cards, named source links, once-only outcomes and question/active-invitation/main-agent routing through [chat/task operations](chat-tasks.md). A question in chat and task detail shares one answer/state. Expose [responsible agent, current relevance and automatic resolution](notifications.md#ownership-and-continuing-relevance), remaining dependency links and useful last/next-check state independently of seen/unread and temporary effects. Resolution and its once-only attributed chat message propagate through shared domain operations, with redacted Wallet evidence. A delayed normal chat message remains accepted; a stale action cannot revive an obsolete operation. Notify open protected forms without closing them or discarding input, and allow still-valid reusable-credential saves through Wallet's existing protected operations.

## Independence and security

Clients observe fresh changes from every channel. Inspection is read-only, including normalization/migration previews. Writes obey authority, source revisions, configuration/ownership and recovery contracts. Serve SPA/assets and API at the same origin with compatible live updates, including bounded polling. Responses do not depend on server-rendered runtime HTML or form actions.

Bind HTTP only to `127.0.0.1`. Accept only the listener's exact `127.0.0.1:<port>` or `localhost:<port>` Host and matching HTTP Origin, and reject forwarded headers and cross-origin/cross-site fetches before serving assets or API. Never trust a proxy to grant local authority.

The shared local graphical view and the deprecated standalone browser entry bootstrap with `GET /api/session` and `X-PTBK-Client: dashboard`, then send the returned in-memory `csrf` capability as `X-PTBK-CSRF` for API reads and writes. The standalone entry creates no pairing, persistent device session or cookie. The packaged Android client has an additional app-owned bootstrap credential. Direct local clients use `Authorization: Bearer <token>` with the credential in the owner-readable ignored `.ptbk/service/process.json`; it changes when the engine restarts. Ordinary snapshots never disclose either credential. Old remote tokens and device cookies confer no authority. Keep Wallet owner-only recovery-word presentation restricted to local browser/terminal surfaces, not direct API clients.

Reject invalid/stale credentials and access outside scope, prevent caching of private responses and never expose unredacted diagnostics or profile contents.

Client failure cannot stop a daemon, reset state or duplicate tasks. The shared [SPA](dashboard.md) serves packaged clients at `/`. Standalone access is deprecated. Host-wide [global discovery](global-dashboard.md) is a separate local inventory, not silently extended project API authority.

Book-source inspection/editing is available through the shared operations, including source revision checks, nonblocking content warnings, scoped commits and ordinary repair task context. Chat and required first-message routing remain available alongside queued work and during scheduling pause; creating a task then saves it pending. Source edits cannot change engine-owned Expert definitions or overwrite another operation's changes.

Protected local owner flows share [credential import](wallet-import.md) and [word replacement/reset](wallet-recovery.md), including selection/revision safety and explicit destructive confirmation. Raw exports and generated words never enter ordinary responses/agent endpoints; existing local owner-only word-presentation rules remain. Import/rotation/reset persist only in protected Wallet storage and create no Git commit.

## Sessions and contextual work direction

Expose the shared [session inventory/detail](harness-sessions.md), including idle sessions, technical identity, actual agent/task/chat/occurrence context, capabilities, model/account/billing labels, usage freshness, control leases and native-attachment availability. Entry uses the same decline-default watch/control choices and explicit shared-control warning as the dashboard; API transport cannot bypass read-only/exclusive gates or stale-state checks. Detach and termination are separate outcomes.

Expose accepted task changes/reopening/cancellation/retirement and durable per-session Saved/Delivered/Applied receipts through shared [task-control](task-control.md) operations. Reads never issue steering or invitations. Pause blocks task continuation including queued steering, while chat remains available; only supported interrupt/cancel reconciliation may occur without task execution. No per-agent/task/session lifecycle toggle is added by these operations.

The External activity log API shares the [view contract](action-log-ui.md): default/ungrouped/task/agent grouping, explicit batch membership, outcome filtering, post-aggregation impact cutoff and time/impact/smart sorting. Return bounded members, complete/incomplete known subtotals and actual methodology evidence. Inspection uses derived caches and never calls a model or mutates actions.
