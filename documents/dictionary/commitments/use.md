# USE

The `USE` commitment is a powerful keyword used in [Book Files](../core/book-file.md) to grant an [Agent](../core/agent.md) specific capabilities, tools, or access to external systems. It defines "what the agent can do" beyond just generating text.

In modern Promptbook development, `USE` is the primary way to extend an agent's functionality.

## Core Capabilities

-   [**USE MCP**](./use-mcp.md) - Connects the agent to external tools and services via the Model Context Protocol.

## Example

```book
John Green

PERSONA You are a helpful technical support assistant.
USE MCP https://mcp.example.com/server
RULE Always try to find a solution in the official documentation first.
```

In this example, John Green is equipped with external tooling through the Model Context Protocol, so he can look up information in the systems that the server exposes to him.

## Why use USE?

-   **Empowerment**: It turns a static text generator into a proactive problem solver.
-   **Integration**: Seamlessly connect your agents to your existing infrastructure via [MCP](./use-mcp.md).

## Related Concepts

-   [**Agent**](../core/agent.md)
-   [**Knowledge**](./knowledge.md)
-   [**Tools**](../technical/tools.md)
