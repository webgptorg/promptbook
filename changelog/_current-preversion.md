### 📖 Book Components

-   Use **Monaco Editor** for syntax highlighting in `<Chat/>` component (instead of `highlight.js`)
-   Use **Book Editor** for displaying `book` code snippets in `<Chat/>` component
-   Added **Download button** for code blocks in `<Chat/>` component
-   Added **Download button** for embedded books in `<Chat/>` component
-   Added **Copy to clipboard button** for code blocks in `<Chat/>` component (works for both Monaco Editor and Book Editor)
-   Added **Create Agent button** for embedded books in `<Chat/>` component (only in Agents Server)

### 🐇 Agents Server

-   Support for **`META DESCRIPTION`** commitment: Allows setting a specific description for the agent profile page, independent of the persona
-   Use default generated avatar images instead of Gravatar for agents without custom avatar
-   Export entire book documentation as one coherent markdown file to `/api/docs/book.md`
-   Better UI for documentation actions (Print, Download Markdown) in `/docs`
-   Fixed file upload to Vercel Blob: Using proper client upload protocol with `handleUpload` instead of direct PUT requests
-   New **Messages & Emails** admin page: Allows inspecting all inbound and outbound messages and their delivery status
-   New **Files** admin page: Allows inspecting all uploaded and generated files
-   Added **Capability Chips** to Agent Profile and Home Screen (Agent Cards): Visual indicators for `USE BROWSER`, `USE SEARCH ENGINE`, and `KNOWLEDGE` commitments

### 🛝 Playground

-   New `elevenlabs-realtime-agent` page: Simple miniapp for testing ElevenLabs Realtime API voice calls with abstract visual interface
-   New `openai-realtime-agent` page: Simple miniapp for testing OpenAI Realtime API voice calls with abstract visual interface
-   New `textarea-to-chat` page: Shows a textarea on the left and Chat component on the right with 1:1 message mirroring
-   New `test-browser` page: Runs a Playwright browser instance, navigates to ptbk.io, and displays a screenshot
-   New `search-engine-test` page: Simple miniapp for testing Search Engine providers (e.g. Dummy, Bing, etc.)

### 📚 Book

-   Use explicit types instead of type inference across the repository to improve code readability and maintainability
-   Added `DICTIONARY` commitment for defining terms and their meanings that agents should use consistently in reasoning and responses
-   `USE SEARCH ENGINE` commitment now allows specifying search scope or instructions as arbitrary text
-   `CLOSED` commitment now only works if it is the **last** commitment in the book
-   Agents now self-learn `KNOWLEDGE` from conversation context by automatically extracting facts and appending them to the agent source

### 🔍 Search Engines

-   Implemented `BingSearchEngine` using Bing Search API

### 🛠 Tools

-   Allow to pass tools into the `ChatPrompt.modelRequirements.tools`
-   The tool calling functionality is implemented for now for `OpenAiExecutionTools`
-   `USE SEARCH ENGINE` and `USE BROWSER` commitments now automatically add `web_search` and `web_browser` tools to the agent requirements
