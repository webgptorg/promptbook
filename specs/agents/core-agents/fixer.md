# Fixer: ordinary core problem-solving agent

[Agents](../_index.md) · [Core agents](../core-agents.md) · [Automatic repair principle](../../concepts/automatic-repair.md) · [Learning](../learning.md)

**Fixer is an ordinary editable, default-OPEN core agent**, initialized as a small `agents/.core/fixer.book`. Its general purpose is to solve problems and offload decisions from the user. It is not restricted to Promptbook internals: project health, broken workflows, configuration, recurring failures and other authorized project problems are all within that general role.

The engine expects Fixer in every project because it automatically routes certain problems, such as merge conflicts and crash/recovery failures, to this role. That required presence is why it is a core agent; it does not confer special inference, privileged execution or a separate communication mechanism. Other agents can consult Fixer, and Fixer can consult other agents through ordinary TEAM relationships.

A deliberately minimal initial example:

```book
AGENT Fixer
FROM @Adam
GOAL Solve problems and reduce the decisions the user needs to make.
RULE Resolve routine authorized problems yourself; ask User before changing their explicit requirements when the repair would alter their intent.
TEAM @User
TEAM Consult @Expert for current Promptbook syntax and capabilities.
OPEN Learn verified project-specific problem-solving practices and user preferences.
```

User is in the initial team, not hardwired into every future escalation. The Book and its TEAM are customizable: a user can require consultation on everything, define detailed thresholds, or remove User and request autonomous resolution. These are ordinary agent instructions subject to the project's authority and safety rules. Preserve existing and learned Books during reinit/upgrade; do not reinsert a deliberately removed team member. Expert remains general and engine-owned, while Fixer applies current engine knowledge to local context.

Fixer can inspect available logs, task traces, actual diagnostics and project sources without inventing evidence or disclosing secrets. Examples include malformed Books, normalized-name collisions, unresolved references, failed migrations, unavailable tools and difficult Git conflicts. Safe deterministic corrections/retries are part of the shared [automatic repair path](../../concepts/automatic-repair.md); not every fault needs a model call or user question.

Run justified health enquiries at a bounded persisted cadence and after relevant diagnostic changes. They are ordinary scheduled/derived work in the project's single-task agenda, not an additional permanent privileged service. Diagnose source, impact and confidence; repair/check authorized work and ask the team only as needed under the current Book policy. The mechanism does not prescribe a special prompt, dashboard category or transport for those questions.

Fixer uses precisely the same OPEN/CLOSED and Teacher mechanisms as other agents. Verified outcomes and user replies can teach useful repair preferences through ordinary work committed to its own Book. Suppress repeated unresolved requests for the same condition and avoid repair loops. If no work is justified, no model call or manufactured modification is needed. If execution resources are unavailable, retain the issue visibly until normal work can proceed; being core does not make Fixer runnable without a harness.

## Default caution and shared failures

The initial Book is cautious about changing an explicit user requirement, for example local-only inference: normally ask User before making that change. This is editable agent policy, not a new engine-level immutable-constraint mechanism or a special Fixer permission system. Fixer can edit MODEL and other project sources through normal authorized work; preserve and show the resulting decision in Git.

Persistent Router/Tasker failures, impossible execution combinations and detected problematic Book contents use the same ordinary repair task path as other system failures. Generic cause-aware retries handle transient network loss, exhausted quota and reported recovery times first. Preserve the original blocked task and create a separate repair task with available diagnostics; suppress duplicates. A user can still save a problematic Book after seeing a warning. Repair must not discard the user's saved source or falsely complete affected work.

Core-template conflicts use the same ordinary repair path: inspect old template, new template and current project Book, retain user/learned changes and resolve justified overlaps before asking User. Do not request a mechanical merge from the user merely because a template changed. Follow [shared core preparation](../core-agents.md#shared-preparation-and-template-updates), deduplicate pending conflicts and preserve customized consultation policy.
