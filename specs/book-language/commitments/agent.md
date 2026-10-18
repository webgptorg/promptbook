# AGENT

[Commitments](_index.md) · [Syntax](../syntax.md) · [Agents](../../agents/_index.md)

**Document:** Agent; required first commitment, exactly once.

`AGENT <name>` declares an agent whose nonempty, single-line display name is `<name>`. For example, `AGENT Frontend Developer` names the agent `Frontend Developer`. Normalize the name content only, not the keyword or filename. Use the same commitment/content boundary as every other line; there is no special bare-name parser.

Subsequent commitments build the agent's role, goals, rules, knowledge, relationships and learning policy. Agent inheritance and OPEN/CLOSED retain their existing semantics. Core project agents use this same declaration; engine-provided non-agents still require no project file.

Agent names do not receive the automatic task/chat date-time decoration. Folder placement cannot replace this declaration. Additional AGENT, TASK or CHAT root declarations in the same source are invalid. See [references](../references.md).
