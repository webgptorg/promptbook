# Agent inheritance

[Book language](_index.md) · [FROM](commitments/from.md)

FROM defines a directed, single-parent relationship. An agent inherits its parent's rules, knowledge and other inheritable instructions, which may themselves come from another parent. Local instructions extend/specialize that foundation without silently discarding constraints. Each effective instruction remains attributable to its source.

Without an explicit FROM, an agent inherits Adam. Adam's supplied source uses `FROM @Void` to terminate the default chain, but the user may insert other ancestors. All chains must terminate, rather than directly or indirectly return to an earlier agent. Name aliases do not hide a cycle.

`@Void`/`@Null` contributes no instructions and ends inheritance. `@User` is not a valid parent. Expert's engine-owned layer supplies running-version expertise **on top of the current project's Adam**, not a separate universal Adam. A local `Modified Expert` can inherit Expert and become Teacher's parent; both receive project Adam transitively. Different project Adams yield different effective Experts. Normal cycle detection includes internal inheritance: Adam -> Expert -> Adam is invalid.

Referenced [common knowledge](../concepts/common-knowledge.md) resolves as knowledge with source/version identity, then composes through project Adam and any internal Expert/derived layers. User replacement, pinning, inline customization or deliberate Void/Null ancestry is respected. Remote knowledge cannot grant privileges, discard project constraints or silently rescore past actions.

OPEN/CLOSED describes the learning permission of the target Book itself, not a requirement that descendants share the parent's learning status. Teacher's own closure is independently validated.

IMPORT is in-place composition rather than another parent; inclusion must also terminate. TEAM is consultation rather than inheritance, and may contain valid reciprocal/cyclic references. See [IMPORT](commitments/import.md), [TEAM](commitments/team.md) and [consistency](../agents/consistency.md).
