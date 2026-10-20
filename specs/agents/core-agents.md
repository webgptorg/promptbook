# Core agents and minimal project-owned defaults

[Agents](_index.md) · [Engine and project evolution](../concepts/engine-and-project.md)

The engine expects five editable project roles: **Adam, Manager, Teacher, Fixer and Chatter**, materialized only if missing under `agents/.core/` as `adam.book`, `manager.book`, `teacher.book`, `fixer.book` and `chatter.book`. Their opening commitments are `AGENT <role name>`; core names do not acquire task/chat date-time decoration. A core has ordinary Book, routing, TEAM, learning, Git and runtime behavior. Being required does not grant a special inference mechanism or extra authority.

Initialize each missing role individually with a small comprehensible boilerplate, not an embedded encyclopedia. Existing Books belong to the project: never reset, replace or bulk-regenerate them during reinit/upgrade, including learned/customized versions. Adding a required Chatter preserves all previously present roles. Invalid/colliding sources use the normal resolver and [automatic repair](../concepts/automatic-repair.md), not silent overwriting.

Initial policies: Adam is the common inheritance foundation (`FROM @Void`, initially CLOSED); Manager inherits Adam; Teacher inherits Expert and must remain CLOSED against recursive teaching. Fixer is OPEN, has User and Expert in its initial TEAM, and has a simple general problem-solving goal. Chatter uses ordinary Adam inheritance/default OPEN learning and focuses on user conversation. These are individual Book policies, not restrictions imposed on every core agent.

Fixer is expected because system problems are routed to it, not because it has a special escalation channel. Its ordinary TEAM and learning support increasingly project-specific decisions. Users may change consultation policy or remove User from its team; reinit does not undo that customization. See [Fixer](fixer.md) and the separate first-class [automatic repair contract](../concepts/automatic-repair.md).

At Chatter creation, its readable TEAM relationships include all other initialized/selected agents, both core and specialist, and access to Expert for engine questions. Do not include itself. Users can customize or extend that team later; initializing a missing role does not rewrite existing teams. See [Chatter](chatter.md).

Core definitions are hidden from ordinary default agent inventories and goal discovery, while remaining explicitly selectable, assignable and referenceable. **New human-chat entry is an explicit exception:** promote Chatter as the default first choice and offer Choose another agent to open the full valid target list, including other cores and Expert. This does not make all core agents ordinary goal-discovery candidates. Hidden status is not access control.

Expert is a comprehensive version-matched engine-defined non-agent, never a project core file. See [Fixer](fixer.md), [Chatter](chatter.md), [Teacher](teacher.md), [inheritance](../book-language/inheritance.md) and [non-agents](non-agents.md).
