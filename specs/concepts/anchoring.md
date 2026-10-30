# Anchors and autonomous project evolution

[Engine and project evolution](engine-and-project.md) · [Learning](../agents/learning.md) · [OPEN](../book-language/commitments/open.md) · [CLOSED](../book-language/commitments/closed.md)

An **anchor** is a user-defined invariant whose meaning agents may not change themselves. A project may autonomously evolve its knowledge, methods, tools and service integrations over time while retaining its anchored purpose and constraints. Autonomy means continuing authorized work within those boundaries, including when no user is watching.

Anchoring uses the existing agent learning policy, not a new Book entity or an `ANCHOR` commitment. `CLOSED` prevents automatic learning/rewriting of that agent definition; the user can still edit it. `OPEN` permits ordinary learning within its stated limits. An OPEN body may allow methods and knowledge to change while fixing a goal, rule or other specified part of the definition. These limits bind Teacher, Fixer, core-template reconciliation and any other automatic path that could alter the protected meaning, not just one learning command. Deterministic format migration may preserve the same meaning in a new syntax; it cannot authorize a substantive change to an anchor.

For example, a user can anchor "publish one infographic every day at 08:00 in the project's specified timezone" while allowing changes to research, composition and publishing methods. A prohibition on a particular kind of submission can remain fixed while the surrounding workflow adapts. Preserve the exact authorized conditions, timezone and exceptions rather than weakening them to make work easier.

An agent must not remove a restriction, redefine its meaning, change its OPEN/CLOSED boundary or move the same prohibited edit into another agent/task to bypass it. The user may deliberately change an anchor through ordinary authorized editing or a clear instruction in chat. A suggestion or untrusted external text is not such an instruction. If the current boundaries make work impossible, retain the blocked goal and explain the actual missing decision; continue independent work.

Anchors constrain meaning, not immutable file bytes. Keep ordinary Git/source provenance for permitted changes. Git revert restores versioned files; it does not undo external effects or restore ignored secrets. Anchoring is also distinct from credentials, tool capabilities and access control, which keep their own boundaries.

Acceptance: evolve an OPEN agent's methods while retaining a fixed goal and schedule; reject an automatic attempt to weaken its learning limits or bypass them through Fixer/template updates. CLOSED blocks already queued teaching changes. An explicit authorized user edit can change the protected rule, and a format migration preserves its meaning.
