# Core agents and minimal project-owned defaults

[Agents](_index.md) · [Engine and project evolution](../concepts/engine-and-project.md)

The engine expects six editable project roles under `agents/.core/`. Each has a separate specification explaining why it exists:

| Role | Project Book | Purpose |
| --- | --- | --- |
| [Adam](core-agents/adam.md) | `adam.book` | Common project instruction foundation. |
| [Router](core-agents/router.md) | `router.book` | Select a compatible agent and concrete execution parameters. Replaces Manager. |
| [Tasker](core-agents/tasker.md) | `tasker.book` | Create, clarify and manage tasks, without performing routing. |
| [Teacher](core-agents/teacher.md) | `teacher.book` | Learn from completed work through ordinary teaching tasks. |
| [Fixer](core-agents/fixer.md) | `fixer.book` | Solve system/project problems through ordinary agent work. |
| [Chatter](core-agents/chatter.md) | `chatter.book` | Project spokesperson, briefs and default general conversation. |

Their opening commitments are `AGENT <role name>`; core names do not acquire task/chat date-time decoration. A core has ordinary Book, routing, TEAM, learning, Git and runtime behavior. Being required does not grant a special inference mechanism or extra authority.

Core identifies engine-prepared project roles, not additional runtime permissions or an execution kind. Their work remains ordinary task work. **Core task** describes work performed exclusively by core agents; it is independent of [content/system purpose](../concepts/minimal-interruption/work-purpose.md). Automatic template reconciliation must preserve the user's [anchors](../concepts/anchoring.md) and learning limits, rather than treating a newer template as permission to change them.

Initialize each missing role individually with a small comprehensible boilerplate, not an embedded encyclopedia. Existing Books belong to the project: preserve learned/customized content through the shared three-way update policy below, never reset or bulk-regenerate them. Adding a required Chatter preserves all previously present roles. Invalid/colliding sources use the normal resolver and [automatic repair](../concepts/automatic-repair.md), not silent overwriting.

Initial policies: Adam is the common inheritance foundation (`FROM @Void`, initially CLOSED); Router and Tasker inherit Adam. Initialize Router with a concrete MODEL from the first suitable selected harness and its plugin defaults so it never needs self-routing. Teacher inherits Expert and must remain CLOSED against recursive teaching. Fixer is OPEN, has User and Expert in its initial TEAM, and has a simple general problem-solving goal. Chatter uses ordinary Adam inheritance/default OPEN learning and focuses on user conversation. These are individual Book policies, not restrictions imposed on every core agent.

Fixer is expected because system problems are routed to it, not because it has a special escalation channel. Its ordinary TEAM and learning support increasingly project-specific decisions. Users may change consultation policy or remove User from its team; reinit does not undo that customization. See [Fixer](core-agents/fixer.md) and the separate first-class [automatic repair contract](../concepts/automatic-repair.md).

At Chatter creation, its readable TEAM relationships include all other initialized/selected agents, both core and specialist, and access to Expert for engine questions. Do not include itself. Users can customize or extend that team later; initializing a missing role does not rewrite existing teams. See [Chatter](core-agents/chatter.md).

Core roles are excluded from ordinary automatic goal discovery, while remaining selectable, assignable and referenceable. The explicit dashboard Agents/team inventory includes them all. **New human-chat entry also promotes a core role:** promote Chatter as the default first choice and offer Choose another agent to open the full valid target list, including other cores and Expert. This does not make all core agents ordinary goal-discovery candidates. Hidden status is not access control.

Expert is a comprehensive version-matched engine-defined system agent, never a project core file. See [Fixer](core-agents/fixer.md), [Chatter](core-agents/chatter.md), [Teacher](core-agents/teacher.md), [inheritance](../book-language/inheritance.md) and [system agents](system-agents.md).

## Shared preparation and template updates

Init and start use one idempotent preparation operation for **all** required core roles, not just Adam. Add newly introduced/missing core agents during ordinary start without requiring init again, another bootstrap task or unrelated setup.

Retain the exact engine template/baseline from which each installed core Book was created or last reconciled, with sufficient version/template provenance, for example in persistent ignored `.ptbk/` metadata. It is not a cache to erase during cleanup. Compare **old baseline, new engine template and current project Book**. Apply unambiguous upstream changes while preserving independent user/learned changes; update an unchanged template directly. Never blindly append duplicate commitments or overwrite customized Books.

Send overlaps, ambiguous intent or unverifiable baselines to ordinary Fixer with the available sources/diagnostics. Any needed agentic reconciliation runs as ordinary queued Fixer work; init does not execute reconciliation inline; its separate preparatory harness checks and project-name generation remain allowed. Fixer tries to resolve them under current project policy; consult User only when their decision is actually needed. If resources are unavailable, retain pending repair, without false merge success or duplicate repair tasks. Conflicts affect the relevant role/work, not unrelated supervision or usable agents.

Use ordinary ownership, validation and scoped Git provenance. Record a new baseline only after successful reconciliation. Repeated preparation against the same templates is a no-op. This template maintenance is distinct from deterministic language/configuration migration; it introduces neither a migration agent nor per-Book age heuristics.

## Acceptance outcomes

Start an existing project with a newly introduced core role: add it without another init/bootstrap. Exercise unchanged, independently customized and overlapping templates, including Adam and Fixer. Automatic updates preserve learned/user rules; conflicts go to Fixer before human attention. An unknown baseline never permits guessing away local edits. Reinit/restart does not duplicate commitments, reset customized TEAM membership or repeat an already resolved update.
