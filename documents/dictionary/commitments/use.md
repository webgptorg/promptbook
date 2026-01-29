# USE

The `USE` commitment is a powerful keyword used in [Book Files](../core/book-file.md) to grant an [Agent](../core/agent.md) specific capabilities, tools, or access to external systems. It defines "what the agent can do" beyond just generating text.

In modern Promptbook development, `USE` is the primary way to extend an agent's functionality.

## Core Capabilities

-   [**USE BROWSER**](./use-browser.md) - Grants the ability to access and extract data from the live web.
-   [**USE SEARCH ENGINE**](./use-search-engine.md) - Grants the ability to perform web searches.
-   [**USE TIME**](./use-time.md) - Allows the agent to know the current date and time.
-   [**USE MCP**](./use-mcp.md) - Connects the agent to external tools and services via the Model Context Protocol.

## Example

```book
John Green

PERSONA You are a helpful technical support assistant.
USE SEARCH ENGINE
USE BROWSER
USE TIME
RULE Always try to find a solution in the official documentation first.
```

In this example, John Green is equipped with a full suite of tools to help users. He can search for documentation, read the content of web pages, and he knows today's date, which helps him understand if a particular piece of information is still relevant.

## Why use USE?

-   **Empowerment**: It turns a static text generator into a proactive problem solver.
-   **Accuracy**: Agents can verify facts and find up-to-date information.
-   **Integration**: Seamlessly connect your agents to your existing infrastructure via [MCP](./use-mcp.md).

## Related Concepts

-   [**Agent**](../core/agent.md)
-   [**Knowledge**](./knowledge.md)
-   [**Tools**](../technical/tools.md)
