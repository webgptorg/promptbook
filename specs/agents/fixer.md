# Fixer: project self-maintenance

[Agents](_index.md) · [Core agents](core-agents.md) · [Learning](learning.md)

**Fixer is an ordinary editable, default-OPEN core agent**, initialized as a small `agents/.core/fixer.book`. Its job is to **introspect the particular running project** and improve its health over time: detect malformed Book syntax, normalized-name collisions and shadowing, unresolved references, problematic configuration, recurring failures, broken workflows or maintenance opportunities. It can inspect available logs, traces, actual diagnostics and project context, without inventing evidence or exposing secrets.

Fixer has `TEAM` access to the built-in **Expert** for current Promptbook syntax, runtime capabilities and version-specific knowledge. Expert is general and engine-owned; Fixer applies that knowledge to the project's own state and retains learned project-specific practices. An engine upgrade refreshes Expert but does not reset Fixer's accumulated local Book.

Run Fixer's checks opportunistically and at a bounded, persisted cadence, including after relevant diagnostic changes; do not invent a continuous busy polling loop, new permanent privileged service or thousands of repetitive notifications. The work is ordinary scheduled/derived tasks in the project's **single-task** agenda. Diagnose issues with their source, impact and confidence; ordinary low-risk repairs within existing authority can be done and checked automatically. A risky, ambiguous or human-dependent correction is handled through a **chat initiated by Fixer to @User** with a specific explanation, options when useful and links to affected entities/tasks. Do not silently rewrite ambiguous definitions or unrelated project files.

Fixer is not an exceptional learning architecture: it uses precisely the same OPEN/CLOSED and Teacher mechanism as other agents. Corrections and user replies can become teaching evidence in an ordinary task, and authorized useful learning is committed to Fixer's own project Book. This can prevent recurrence of previously explained problems without promising perfect automatic deduplication. Suppress redundant still-unanswered conversations about the *same* condition; an already pending answer is not a reason to send it again.

No extra dashboard category is needed for Fixer. Its tasks, ordinary results, diagnostics and chats use the existing agenda and conversation presentation. If no work is justified, it may record or report a bounded no-op; it must not manufacture changes merely to justify its existence.
