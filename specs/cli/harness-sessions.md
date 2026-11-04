# Harness sessions and live control

[Main specification](../_main.md) · [Adapters](harness-plugins.md) · [Harness tools](harnesses.md) · [Dashboard](dashboard-details.md#harnesses-page) · [Task control](task-control.md)

## Separate work, context and execution

A **task** is durable work; a **chat** is a conversation, never a disguised task. A **harness session** is the harness-owned execution/conversation context used by an agent for that work. Its identity, context and lifecycle are distinct from a process, transport connection, model turn, attempt or task occurrence. One task may use several sessions, sequentially or concurrently where ownership permits; each chat has its own attributed context(s), including separate agent contexts in a multi-agent thread. Do not reuse one undifferentiated session for every task and chat of an agent.

Track a stable engine session handle and provider-native identifier(s), the responsible agent, actual task/occurrence or chat/turn, source revision, named tool, harness/version, model/effort, account/authentication and billing context. These technical handles are not new AGENT/TASK/CHAT entity IDs. Reconnection may replace processes without creating a new logical session; a real replacement session is recorded with its predecessor and reason. Retain ended-session evidence without presenting it as live.

Distinguish opening, idle/ready, working, interrupt requested, interrupted/checkpointed, waiting/blocked, reconnecting, ended and failed/unknown observations, using actual adapter evidence. User-control mode and engine lifecycle are separate dimensions. An idle open session need not run a model or incur periodic inference just to remain open.

## One adapter contract

Extend the existing plugin contract, not a second provider system. It covers create/open, inspect/list, continue with another input, stream actual events/output/usage, interrupt at a supported boundary, checkpoint/resume/reconnect, close and discover supported native attachment. Declare capabilities independently by installed version, selected transport and authentication context. Availability of output streaming does not establish continuing input, steering, read-only attachment or safe detach.

The engine automatically launches/supervises the required local runtime, acquires private endpoints/credentials, restores connections and cleans up owned resources. No routine user-managed port/server step is required. Keep transport details within the adapter; App Server is one Codex integration, not the name of the generic abstraction. Connection recovery cannot duplicate a turn or repeat an uncertain external effect.

Adapters must distinguish a received control input from a processed one under [task control](task-control.md). Unsupported live steering uses supported interrupt/continue or deferred delivery, with an honest pending state; it cannot silently drop the change or start a second executor. Shared runtimes must interrupt/close only the targeted owned work, preserving unrelated sessions/chats. Health, file ownership, permissions, traces and lifecycle remain authoritative.

[Realtime voice](harness-voice.md) is an optional extension of this same session contract, with a call-owned media connection and explicit unsupported adapters. It retains the chat/agent's attributed context, input ownership and accepted-turn receipts; a voice call is not another task or a duplicate backing executor. Ending media does not end independent work. Native voice readiness and native TUI attachment are separate capabilities.

## Common view and actual native client

The **Harnesses** home tile and page replace the former **Current work** tile/log and its execution detail. They show all open sessions, including idle ones, and access to retained ended-session evidence. Agents, Chats, Tasks, Tools, System operational log and the External activity log remain distinct views. The common selected-session detail always exists, even if native attachment is unavailable.

Show the responsible agent, task/chat links, observed state and freshness, tool/harness/account labels, actual model/effort, current phase/wait, available output and statistics, control mode and outstanding instruction receipts. Usage follows [usage](usage.md): unsupported/unknown is not zero, cumulative data is not counted twice and shared-account sessions do not receive independent quotas. Do not invent progress, hidden reasoning or a universal context/cost statistic.

Offer the harness's **actual native TUI** only where the adapter can attach to the same live execution context. Restoring a transcript, launching another executor in the same directory or copying the provider's interface is not attachment. Do not reimplement native TUIs. The accepted terminal baseline temporarily hands over the full screen; a permanent Promptbook frame is optional only through a compatible existing terminal solution. Browser terminal embedding likewise needs a real supported PTY/client and all control gates; a screenshot or simulated terminal is not equivalent.

## Deliberate entry and control modes

Opening common detail is inspection. Entering an interactive session first offers exactly **Do not enter** (focused/default, including plain Enter), **Watch only**, and **Control**. Control then selects **Exclusive takeover** or **Shared control**; shared control requires another explicit warning/confirmation that both the human and Promptbook can send inputs. Respect cancellation without starting a client. Revalidate the selected live session and its current mode at confirmation.

Watch only must prevent all mutating user input, including shortcuts, slash commands, paste and terminal mouse actions. If the native client cannot enforce that, offer the common read-only event view rather than an interactive client labelled read-only. Control cannot bypass task/file ownership or the selected account's authority. If the adapter cannot maintain these invariants, native control is unavailable with an explanation.

Exclusive takeover acquires a session-scoped control lease: Promptbook stops all automatic inputs to that session, including queued inputs and indirect helpers; already accepted work is observed honestly until its supported boundary. A second controller cannot silently steal the lease. Other sessions and agents continue normally. Task changes can still be saved, but their delivery waits. Shared control serializes/attributes actual inputs and preserves their accepted order; no uncontrolled dual typing or authority escalation is permitted.

## Detach and return

Before entering, show the adapter's verified way to **detach and return** and distinguish it from terminating a turn/session. Escape and `/exit` are not universal detach commands: preserve the native client's semantics. An adapter may expose safe native detach, a dedicated wrapper escape or ordinary client exit only when its actual effects are known. Unsupported attachment remains unavailable; do not require a product decision from the user for each key binding.

The dashboard remains a client of the independently running engine. After orderly detach, client exit or client failure, restore terminal modes/rendering and return to the **same selected session detail within Harnesses**, with navigation/selection preserved, not a shell prompt. A failed/ended session remains inspectable there. If a native exit actually terminated work, report that outcome rather than pretending it was harmless detach. Safe detach itself ends neither the task nor the backend/engine, and never stops other sessions.

On detach, exclusive input ownership returns to Promptbook only after lease/liveness reconciliation. On connection loss, detect/reconcile the controller, expire/revoke its lease in a bounded manner and prevent both stale clients and a second automatic controller from writing. Do not replay an old automatic queue: re-evaluate the latest task changes, lifecycle, account and external effects. Pause/Stop still governs task work even during takeover; returning control never clears a pause reason. Do not secretly resume task execution to flush inputs during pause or stopping.

## Adapter priorities and verification

OpenAI Codex and Claude Code are first priority; OpenCode, Qwen Code, Gemini CLI and GitHub Copilot use the same contract. Verify capabilities for the actual installed release/integration rather than promising every feature on every harness. Native Codex App Server/TUI, Claude native background attachment versus SDK, OpenCode backend attachment and any limited clients require separate integration checks. A native CLI attachment feature does not prove attachment to an arbitrary SDK run. Where native attachment is unavailable, retain useful common inspection and supported programmatic control.

Support subscription and API routes where that provider and integration actually permit them. Preserve the user's selected native context, endpoint and billing path; switching to an SDK is not proof that a native subscription remains usable. Never silently substitute paid API credentials, a different account or unsupported third-party subscription access. Unknown billing remains explicit. Reuse [authentication](harness-authentication.md) and [usage](usage.md), without inventing login requirements while only viewing a session.

## Acceptance outcomes

Verify autonomous task completion and subsequent input with real Codex and Claude integrations, then each additional supported adapter. Exercise subscription/API distinctions on supported routes without silent switching. One task uses multiple sessions; separate chats retain context and authorship; several agents use sessions in the same directory with coordinated file writes. A session survives a client reconnect without a second worker.

Open the replacement Harnesses tile, select an idle or active session, inspect only, decline entry, watch without mutation, take exclusive control and explicitly confirm shared control. Queued automatic input is gated before exclusive entry. Other sessions continue. Detach/client failure/resize restores the same detail and terminal; session closure is reported accurately. Test leases, duplicate clients, pause/stop and pending task edits through reconnect and restart. Unsupported metrics/attach remain honest, and no native UI is copied.
