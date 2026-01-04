# USE MCP

The `USE MCP` commitment allows an [Agent](../core/agent.md) to connect to an external server using the **Model Context Protocol (MCP)**. MCP is an open standard that enables AI models to safely and easily interact with external tools, databases, and APIs.

By using MCP, an agent can perform actions that are not built directly into the Promptbook library, such as querying a specific company database, sending an email through a corporate system, or controlling IoT devices.

## Example

```book
John Green

PERSONA You are a corporate legal assistant.
USE MCP https://mcp.green-legal-firm.com/api
RULE Always check the internal case database before answering.
```

In this example, John Green is connected to a private MCP server that provides tools for accessing the firm's legal database.

## How it Works

1.  **Connection**: The agent establishes a connection to the specified MCP server URL.
2.  **Discovery**: The agent asks the MCP server what tools and resources it provides (e.g., `query_database`, `send_notification`).
3.  **Execution**: When the agent needs to perform an action, it sends a request to the MCP server.
4.  **Result**: The MCP server performs the action and returns the result to the agent.

## Benefits

-   **Extensibility**: Add any capability to your agent by creating an MCP server.
-   **Security**: Keep sensitive data and logic on your own servers; the agent only gets the data it needs.
-   **Standardization**: Use the same protocol to connect agents to different systems.

## Related Concepts

-   [**Agent**](../core/agent.md)
-   [**USE BROWSER**](./use-browser.md)
-   [**Tools**](../technical/tools.md)
