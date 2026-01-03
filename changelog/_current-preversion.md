### 📚 Book

-   Implemented `IMPORT` commitment which is similar to `FROM` but can be used multiple times and imports content at the location of the commitment.
-   Allow to attach files to the chat messages in Agents Server [2025-12-0900-agents-server-chat-attachements.md](https://github.com/webgptorg/promptbook/blob/main/prompts/2025-12-0900-agents-server-chat-attachements.md)
-   Implement Ctrl+S shortcut in `<BookEditor/>` component
-   Implement Ctrl+V shortcut in `<BookEditor/>` component for pasting images and files
-   Implement Ctrl+S shortcut in `<Chat/>` component for opening export menu
-   Implement tool calling loop into the `LlmExecutionTools`. Currently only for `OpenAiCompatibleExecutionTools`
-   Show floating hint when creating new agent in Agents Server [2025-12-0920-agents-server-hints.md](https://github.com/webgptorg/promptbook/blob/main/prompts/2025-12-0920-agents-server-hints.md)
-   Agents Server can generate boilerplate rules and personas in the same language as the agent name [2025-12-0950-agents-server-boilerplate-rules-and-personas-in-language-of-server.md](https://github.com/webgptorg/promptbook/blob/main/prompts/2025-12-0950-agents-server-boilerplate-rules-and-personas-in-language-of-server.md)
-   Record all tool calls and aggregate usage in `promptResult` when the tool calling loop is used.
-   Improved the design of the agent server name in the header to prevent wrapping on long names
