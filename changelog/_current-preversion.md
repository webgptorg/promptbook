### 📖 Book Components

-   Use **Monaco Editor** for syntax highlighting in `<Chat/>` component (instead of `highlight.js`)
-   Use **Book Editor** for displaying `book` code snippets in `<Chat/>` component
-   Added **Download button** for code blocks in `<Chat/>` component
-   Added **Download button** for embedded books in `<Chat/>` component
-   Added **Copy to clipboard button** for code blocks in `<Chat/>` component (works for both Monaco Editor and Book Editor)
-   Added **Create Agent button** for embedded books in `<Chat/>` component (only in Agents Server)

### 🐇 Agents Server

-   Use default generated avatar images instead of Gravatar for agents without custom avatar
-   Export entire book documentation as one coherent markdown file to `/api/docs/book.md`
-   Better UI for documentation actions (Print, Download Markdown) in `/docs`
-   Fixed file upload to Vercel Blob: Using proper client upload protocol with `handleUpload` instead of direct PUT requests
-   New **Messages & Emails** admin page: Allows inspecting all inbound and outbound messages and their delivery status
-   Added support for `USE BROWSER` commitment, enabling agents to browse the web using a headless browser (Playwright)

### 🛝 Playground

-   New `elevenlabs-realtime-agent` page: Simple miniapp for testing ElevenLabs Realtime API voice calls with abstract visual interface
-   New `openai-realtime-agent` page: Simple miniapp for testing OpenAI Realtime API voice calls with abstract visual interface
-   New `textarea-to-chat` page: Shows a textarea on the left and Chat component on the right with 1:1 message mirroring
-   New `test-browser` page: Runs a Playwright browser instance, navigates to ptbk.io, and displays a screenshot

### 📚 Book

-   Added `DICTIONARY` commitment for defining terms and their meanings that agents should use consistently in reasoning and responses
-   `CLOSED` commitment now only works if it is the **last** commitment in the book
-   Agents now self-learn `KNOWLEDGE` from conversation context by automatically extracting facts and appending them to the agent source
