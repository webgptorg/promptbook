# Agent Book syntax (historical)

> Historical specification retained from the older Agents Server specs. Language principles remain useful, but old paths, server routes and registry details are not the current coder contract; see the [archive policy](_index.md).

[Historical index](_index.md) · [Dictionary](../dictionary.md)

## Source structure

```book
Agent Name

PERSONA You are a helpful assistant that helps with cooking recipes.
RULE Answer only questions about cooking.
KNOWLEDGE https://example.com/recipes.pdf
USE MCP https://mcp.example.com/server
META IMAGE https://example.com/avatar.png
```

-   **Line 1** is the agent name. When missing/empty, a default name is derived.
-   A **commitment** starts with a recognized keyword at the beginning of a line and extends until the next commitment keyword or end of file (so a commitment's content may span multiple lines).
-   The general pattern is `<KEYWORD> <content>`, e.g. `PERSONA You are…`, `USE MCP https://mcp.example.com/server`
-   Text that belongs to no commitment is free-form persona text (part of the system-message composition).
-   **Parameters** may appear anywhere in content: `@ParameterName` (single word) or `{parameter name}` / `{parameterName: description}`. They are substituted from prompt parameters at execution time.
-   **Agent references** in commitment content use curly braces around an agent name or URL, e.g. `TEAM You can talk to {Criminal lawyer} and {https://other-server/agents/xyz}`.

## Composition rules

-   Later commitments generally **extend** the system message; for single-value settings (e.g. `META` types, `MODEL`) the **last occurrence wins**.
-   Commitment application is **ordered**: definitions are applied one by one in source order onto an initially empty requirements object.
-   Unknown leading-word lines are treated as plain content, not errors.
-   `computeAgentHash(agentSource)` MUST be deterministic over the exact source text — it is used for cache keys, history chains, and external service deduplication.

## Related historical specifications

- [Commitment registry](commitment-registry.md)
- [Agent compilation](agent-compilation.md)
- [Agent references](agents/references.md)
