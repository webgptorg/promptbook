# Agent and project consistency

[Agents](_index.md) · [Shared resolution](../book-language/references.md)

Check relevant definitions when the project changes and before work that depends on them. A normalized-name collision within or across Book kinds is **not normally fatal**: use deterministic first-wins resolution, report the effective definition and shadowed sources, and let [Fixer](core-agents/fixer.md) propose or safely apply remediation. A wrong-kind match in a type-constrained commitment is a real reference error; missing and malformed definitions cannot be guessed away. Reserved built-in non-agent names cannot be replaced by project Books.

Initialize only missing required core agents. Do not silently erase customized or learned core content. Report problematic Book content with source context and a warning; preserve saving and send detected issues through ordinary Fixer repair. Do not crash the engine or guess runnable semantics for an invalid affected source. Agent inheritance must terminate; FROM cycles and User as a parent are errors. TEAM cycles/reciprocal consultations are permitted but actual consultations are bounded. Teacher must remain CLOSED; Fixer may be OPEN and learns normally.

Router assignment, teaching, Fixer maintenance and goal discovery use regular tasks and the same project ownership constraints. Prevent recursive router assignment, teacher self-teaching, Fixer issue spam and unbounded model or commit loops. Dependency cycles block affected tasks, not the whole supervisor.

Ignored/dependency Book discovery does not grant authority to change third-party packages. A running service stays inspectable when any of these problems blocks work. See [recovery](../cli/recovery.md) and [task relationships](../cli/task-relationships.md).
