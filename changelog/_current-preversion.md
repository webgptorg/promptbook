### 📚 Book

-   [✨⛪️] Allow to close dialogs by clicking outside of the dialog.
-   Created a series of comprehensive comparison documents between Promptbook and other projects (ChatGPT, Claude, ChatGPT-Assistance, LangChain, N8N, NotebookLM, Wordware, Agno, Letta, Eliza, and Digital Twin platforms like Personal.ai/Delphi) in `/documents/comparison/*.md`. These comparisons highlight Promptbook's unique "Book" language, commitment system (Persona, Knowledge, Rule, Team), and its federated, open-source architecture.
>>>>+++ REPLACE

>>>>+++ REPLACE

-   Implemented `IMPORT` commitment that allows to import generic text files (both local and URL) into the agent source with plugin-based architecture.
-   Implemented GitHub import script that fetches issues and discussions from a Promptbook repository and structures them into Markdown files.
-   Code blocks in the book are assigned to the commitment where they are placed.
-   Allow to attach files to the chat messages in Agents Server [2025-12-0900-agents-server-chat-attachements.md](https://github.com/webgptorg/promptbook/blob/main/prompts/2025-12-0900-agents-server-chat-attachements.md)
-   Implement Ctrl+S shortcut in `<BookEditor/>` component
-   Implement Ctrl+V shortcut in `<BookEditor/>` component for pasting images and files
-   Implement Ctrl+S shortcut in `<Chat/>` component for opening export menu
-   Implement tool calling loop into the `LlmExecutionTools`. Currently only for `OpenAiCompatibleExecutionTools`
-   Show floating hint when creating new agent in Agents Server [2025-12-0920-agents-server-hints.md](https://github.com/webgptorg/promptbook/blob/main/prompts/2025-12-0920-agents-server-hints.md)
-   Agents Server can generate boilerplate rules and personas in the same language as the agent name [2025-12-0950-agents-server-boilerplate-rules-and-personas-in-language-of-server.md](https://github.com/webgptorg/promptbook/blob/main/prompts/2025-12-0950-agents-server-boilerplate-rules-and-personas-in-language-of-server.md)
-   Record all tool calls and aggregate usage in `promptResult` when the tool calling loop is used.
-   Improved the design of the agent server name in the header to prevent wrapping on long names
-   Samples of communication (USER MESSAGE and AGENT MESSAGE) are now transferred into the system message.
-   The initial message is now also included in the example interaction within the system message and is passed into the samples with `question` set to `null`.
-   Horizontal lines (`---`) are now filtered out from the system message.
-   Use Teacher Agent for self-learning of the agents.
-   Self-learning is now a two-step process: first appending conversation samples, then asynchronously calling the Teacher Agent.
-   Added `TEACHER` well-known agent to the core server configuration.
-   Fixed syntax highlighting for `LANGUAGES` and `RULES` in the book editor to ensure the whole word is highlighted, preferring long forms over short forms
-   Implemented `USE TIME` commitment to add the ability for agents to determine the current date and time.
-   Added timezone awareness to `USE TIME` commitment.
-   Make `USE SEARCH` commitment work with `SerpSearchEngine` in `Agents Server`.
-   Implemented `SerpSearchEngine` that uses the SerpApi to fetch Google search results.
-   Implemented `GoogleSearchEngine` that uses Google Custom Search JSON API to fetch results.
-   Defined tools in OpenAI Assistant when creating or updating it through `AgentLlmExecutionTools`.
-   Books can contain Markdown code blocks, which are treated as raw text and not parsed for commitments
-   Code blocks in the `<BookEditor />` are distinctly highlighted
-   Do the full proxy of the given LLM tools in `countUsage` and `cacheLlmTools`
-   Show linked Agents on Agent profile via the capability chips
-   Agents social graph on home page
    -   Show agents as nodes in an interactive graph view
    -   Visualize connections via inheritance (`FROM`) and `IMPORT`
    -   Support for zooming, panning, and dragging nodes
    -   Filter connection types and focus on specific agents
    -   Persist view and filters in URL query parameters
    -   Show agents from federated servers in the graph
    -   Each federated server is represented as a color-coded cluster
    -   Visualize cross-server links between agents
    -   Advanced filtering by server and specific agents within servers
    -   Federated agents are loaded independently and shown in clusters in the graph view.
    -   Added loading and error indicators for federated servers in the graph and filter dropdown.
    -   Show tool call indicator (spinner + tool name) during LLM execution in `<Chat/>` component
    -   Make the Agents Graph visually more appealing [1]
        -   The arrow should be at the end of the edge showing the direction of the link
        -   The chip with the agent should be visually more appealing, Use image and color of the agent in a nice looking circle.
            -   In the agent graph, each agent should have its own profile picture in the circle.
            -   The color should be preserved but only as a background, not the full picture.
            -   In The tooltip shows the agent description. Do not replicate the agent name.
        -   The Group around federated agent server should be circle, not square.
        -   Also, the group around federated servers should not overlap. It should be separate, distinct clusters. Connection between the agents can go across the federated server group boundary.
        -   Fixed and improved agent graph relations:
            -   Show directional graph arrows and moving particles to indicate connection direction
            -   Corrected URL normalization for inheritance (`FROM`) and `IMPORT` links to ensure agents are correctly connected (e.g., matching Sophia Green and Sophia Supergreen)
            -   Ensure connections correctly respect user preferences in checkboxes
>>>>+++ REPLACE

-   Added `linguisticHash` utility function to `@promptbook/utils` that creates human-readable hashes.
-   Added `Linguistic Hash` tool to the Utils app.
-   Prevent caching when tool is used, but still write the messages into the cache or `USER MESSAGE` + `AGENT MESSAGE` pair
-   Implemented modular voice speech input in `<Chat/>` with two providers: `BrowserSpeechRecognition` (Web Speech API) and `OpenAiSpeechRecognition` (Whisper API).
-   Added voice input test page at `/admin/voice-input-test` in Agents Server.
-   Added microphone button to `<Chat/>` with visual recording indicators and real-time transcription insertion.
-   Enhanced visuals of the agent chat page
-   Added grained background to the chat page (matching the agent profile page)
-   Increased saturation of agent messages for better visibility
-   Fixed chat page height to exactly 100vh to prevent unnecessary scrolling
