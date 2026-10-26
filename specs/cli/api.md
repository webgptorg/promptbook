# Project service API

[Main specification](../_main.md) · [Shared controls](controls.md) · [Remote access](remote-access.md)

The active engine exposes an independently usable authenticated HTTP API for project inspection/control. It requires neither browser app nor terminal dashboard. Zero, one or many clients use the same scheduling, lifecycle, management and recovery operations; neither clients nor page rendering create another worker.

Start enables loopback HTTP in either process mode on a free or explicitly selected port and reports actual address/conflicts. Protected remote tunnelling follows its separate default policy. No-tunnel keeps local HTTP; no-server disables HTTP/SPA/tunnel but not local engine control/discovery.

## Observed state and shared operations

Expose project identity, actual engine version, instance/freshness, four live [service states](service-lifecycle.md), pending intent, concurrent task/agent/phase collection, selected detail, shared capacity/queue, results, waits/errors, links, configuration revision/effective sources and commit mode. Resource waits and failed synchronization are not new lifecycle states. An unreachable engine is not proof of a completed stop.

Execution data includes actual named tool, harness variant, model/thinking level and attempt/consultation attribution, with unknown/unsupported distinctions. Tool inventory includes canonical saved records, enabled/usability/in-use state and retained old uses distinct from new defaults. Authorized browser diagnostics identify each named instance's profile source/resolved path, mode, ownership/health and redacted recovery outcome. Ordinary state never exposes cookies, profile contents, resolved API keys or pairing/device credentials.

Expose lifecycle controls, real pacing wait skipping, per-browser diagnosis/recheck/retry/restart, chat operations and supported settings changes. Apply shared stale-request/confirmation rules, including replacing pending stop with pause. Distinguish accepted, pending safe boundary, applied, committed, failed, unconfirmed and restart-required outcomes. Expose saved-to-file and pending/committed Git separately; immediate-commit operations retain that requirement.

## Shared saved tool management

Expose the same list/show/add/modify/reorder/enable/disable/remove operations as [tool CLI/dashboard management](tool-management.md), using the [single typed domain contract](../coding-standards/shared-logic.md), not API-specific validators or Git writes. Saved tool changes commit their authorized versioned configuration immediately and notify live consumers; a running task may use a newly added resource. Preserve other clients' edits, task ownership and operation isolation.

In-use and last-enabled-type protections return explicit decision requirements and revalidate them when applying an acknowledgement. An acknowledgement to retain active work is not a kill request. The emergency route invokes the existing whole-engine force-stop operation; removing a tool remains a separate operation after confirmed stop. Do not add a tool-removal force-stop shortcut. Browser restart/kill/test-tab are separate runtime operations on the shared profile pool, showing effects on all connected engines.

Credential references are readable, actual credentials are not. Where adding a secret is authorized, use a protected write-only input that calls the shared [environment editor](environment.md), with timestamped non-destructive audit and no echoed value in response/error/logs. Do not treat general configuration field writes as permission to read arbitrary environment variables or edit files outside project authority.

## Wallet and encryption boundary

Expose nonsecret Wallet readiness, service/account labels and pending action/result state. Protected owner operations submit credentials and recovery words through concealed write-only input under [Wallet](wallet.md) and [project encryption](project-encryption.md); ordinary status, chat/source export and agent APIs never return them. Agent requests authorize a specific browser login, not raw decryption. Apply project authentication, origin/scope checks, redaction and once-only persistence to these operations; never log request bodies containing secrets. Share one implementation across terminal/browser/API.

## Synchronization

Expose effective autosync enablement and, when enabled, redacted origin/tracking destination, real attempt/integration/publication status, pending/deferred work, errors and next retry. Provide one-cycle manual synchronization through the shared [coordinator](git-synchronization.md). Coalesce overlapping requests, preserve active work and report actual outcomes rather than pretending an accepted request has completed. A disabled policy does not silently become enabled by a stale manual-cycle request. Clients omit the dedicated panel while off.

Network/rejected-push failures do not stop safe local execution or create duplicate result commits. The API observes this policy; it does not implement its own pull loop or merge strategy.

## Chat and creation

Chats expose full names, participants/authors, status/timestamps, history and task/conversation links. Authenticated list/new/open/append/answer use durable Books and normalized names, not new chat IDs. A new human-chat request with no target selects [Chatter](../agents/core-agents/chatter.md); existing-thread participants and explicit targets remain unchanged. Missing/invalid Chatter is diagnosed, not silently replaced. Human answers are promptly saved messages with bounded Git batching; clear their question's attention on accepted save.

Use revision/idempotency checks against stale/reconnecting duplicate writes. Expose canonical agent identity/observed activity for [visual presentation](../agents/visual-identity.md). Distinguish actionable human waits from ordinary internal specialist consultations; Fixer uses these normal agent mechanisms, not a special transport.

Task/chat creation follows [generated names](generated-names.md): opening kind/name, readable creation date/time and normalized collision prevention. Return the final name and actual reference/path rather than asking clients to append timestamps. Retry reconciles the prepared entity instead of creating another. Existing undated names remain unchanged by append/read/recovery. Task trace paths come from [source-filename mapping](traces.md), not client guesses from names.

Expose evolving titles separately from stable opening names, multiple declared participants, progress/final phases and elapsed Thinking data. Accept follow-up input during work with ordered replay/live updates. Expose live task cards, named source links, once-only outcomes and question/mention/main-agent routing through [chat/task operations](chat-tasks.md). A question in chat and task detail shares one answer/state.

## Independence and security

Clients observe fresh changes from every channel. Inspection is read-only, including normalization/migration previews. Writes obey authority, source revisions, configuration/ownership and recovery contracts. Serve SPA/assets and API at the same origin with compatible live updates; SSE alone is insufficient where a tunnel provider does not support it. Responses do not depend on server-rendered runtime HTML or form actions.

Authenticate inspection and mutation before tunnelling. Unauthenticated clients get only a minimal pairing/app shell. Use project-scoped session/direct-client authority, reject invalid/stale/cross-origin requests and access outside scope, and prevent public caching of private responses. Hostname opacity, forwarded headers and apparent localhost origin are not authorization. Never expose unredacted diagnostics, tokens or profile contents.

Client/tunnel failure cannot stop a daemon, reset state or duplicate tasks. The lightweight [SPA](dashboard.md) is a consumer at `/`; host-wide [global discovery](global-dashboard.md) is a separate local inventory, not silently extended project API authority.

Book-source inspection/editing is available through the shared operations, including source revision checks, nonblocking content warnings, scoped commits and ordinary repair task context. Chat and required first-message routing remain available alongside queued work and during scheduling pause; creating a task then saves it pending. Source edits cannot change engine-owned Expert definitions or overwrite another operation's changes.
