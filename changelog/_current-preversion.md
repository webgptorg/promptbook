-   **New:** Chat component can receive additional action via prop `extraActions` [✨🥝]
-   **New:** Allow to prefix Supabase database tables used in Agents Server via `SUPABASE_TABLE_PREFIX` environment variable.
-   **New:** Record conversations to `ChatHistory` table in `Agents Server` application.
-   **New:** Allowed to upload files to `<BookEditor/>` and created `DigitalOceanSpaces` CDN.
-   **New:** Updated all LLM models to the latest versions, including adding Gemini 3, OpenAI's GPT-5.1, and Anthropic's Claude 4.5. Deprecated older models as necessary.
-   **New:** BookEditor fullscreen now renders above all content using a React portal ([DRY], inspired by Tooltip). This bypasses overflow/stacking issues and ensures proper fullscreen behavior.
-   Split collection into pipeline and agent collections.
-   **New:** Allow passing CORS settings into `startRemoteServer` via the `cors` option in `RemoteServerOptions`.  
    These CORS settings are applied to all endpoints of the remote server, including REST, UI, and socket.io, following the DRY principle.
-   **Fix:** On mobile devices `BookEditorMonaco` steals scrolling from the main page content. It now only captures scroll events when it is focused.
-   **New:** Log all LLM calls made during the execution of an `ExecutionTask` into its `llmCalls` property.
-   **New:** `LangchainTranspiler` to transpile the book into Python code using LangChain.
-   **New:** `OpenAiSdkTranspiler` to transpile the book into Javascript code using OpenAI SDK.
-   **New:** Add `showIntermediateMessages` prop to `delayConfig` of `MockedChat` to allow showing the first N messages immediately.
-   **New:** System for `BookTranspilers`.
-   **New:** Created a new `MarkdownContent` component to handle markdown rendering, decoupling it from the `Chat` component.
-   **Refactor:** The `Chat` component now uses the `MarkdownContent` component for rendering markdown.
-   **Fix:** Fixed an issue where the cursor on an empty line in `BookEditorMonaco` was not aligned with the margin line.
-   **Style:** The margin line in `BookEditorMonaco` now crosses over the text lines, creating a more realistic paper notebook appearance.
-   **Style:** Added a left notebook margin line to the book editor for a better writing experience.
-   **Style:** Enhanced the scrollbar design in `BookEditorMonaco` for a more elegant and book-like appearance.
-   **New:** `BookEditor.isReadonly?: boolean` prop which when `true` makes the editor readonly. This should disable all editing capabilities in the editor. By default `isReadonly` is `false`. Allow to set optional `translations` which is object `translations?: {readonlyMessage?: string}` which when set the message from monaco editor when trying to edit the readonly editor. By default the message is "You cannot edit this book".
-   **New:** Book editors now have an action bar in the top right corner, featuring a "Download" button that allows users to download the editor's content as a `.book` file. This button is shown by default but can be hidden by setting the `isDownloadButtonShown` prop to `false`.
-   **Style:** Editor in `BookEditor` now has interval padding 20px from both left, right and top
-   Added notebook-style lines to the book editor for a better writing experience.
-   Reimplemented `<BookEditor/>` using Monaco Editor for improved performance, syntax highlighting, and functionality.
-   Added code samples for `humanizeAiText` utility in Promptbook components.
-   Fixed the "View Source" button in the chat component's avatar profile popup. It now opens the agent's source in a modal, which can be closed by clicking outside, pressing the Escape key, or using the close button.
-   The chat component's avatar profile tooltip now closes when the Escape key is pressed, when scrolling, or when clicking outside of it.
-   Fixed an issue where the "View Source" popup in the `<BookEditor />` was not showing at all.
-   Fixed an issue where the avatar profile tooltip was opening in the wrong position.
-   Chat component have avatar profile on hover, it's outside of the main chat container to avoid being cut off by overflow hidden, it floating on top of everything on the page.
-   Chat component's avatar profile now displays a tooltip on hover, allowing users to view the agent's source in the `<BookEditor />`.
-   Added `isReadonly` prop to `<BookEditor />` to allow read-only mode.
-   Refactored `ChatMessageItem.tsx` to move all inline static styles to `Chat.module.css` and use CSS modules. DRY principle applied.
-   Allow passing a chat thread into `OpenAiAssistantExecutionTools` via the `prompt.thread` property.  
    This enables multi-message conversations and aligns thread handling with `OpenAiAssistantExecutionTools`.  
    [2025-10-14]
    -   Remove problematic usage of `chalk` and `yoctocolors` and use only `colors`
-   Allow passing a chat thread into `createExecutionToolsFromVercelProvider` via the `prompt.thread` property.  
    This enables multi-message conversations and aligns thread handling with `OpenAiAssistantExecutionTools`.  
    [2025-10-14]
-   Allow passing a chat thread into `AnthropicClaudeExecutionTools` via the `prompt.thread` property.  
    This enables multi-message conversations and aligns thread handling with `OpenAiExecutionTools`.  
    [2025-10-14]
-   `<Chat />` now renders math expressions (inline `$...$` and block `$$...$$`) in messages using KaTeX for proper display.
-   Enhanced `renderMarkdown` utility to support math rendering.
-   Added dependencies: `katex`, `@types/katex`.
-   **New:** Added `INITIAL MESSAGE` commitment to define the initial message for the chat in the agent source.
-   **New:** `AgentChat` now supports rendering the initial message defined in the agent source.
-   **Style:** Separators `---` in `BookEditor` are now aligned with notebook lines and appear thicker and darker.
