[ ]

[🤝🧩] Normalize teammate consulting tool representation (no technical IDs in UI) + inject teammate system message

-   *(@@@@ Written by agent)*
-   You are working with [Agents Server](apps/agents-server)
-   When the system provides a "consult a teammate" capability/tool, its UI representation must:
    -   Use the teammate’s *human agent name* (normalized) rather than any internal/technical ID.
    -   Ensure the teammate name is presented consistently across the product (chat, tool picker, conversation UI, etc.).
-   The "consult teammate" tool definition must also include the teammate’s:
    -   introduced system message
    -   description
    -   profile
-   The implementation must ensure the teammate content is passed to the runtime/invocation layer exactly as provided (no omission of the above fields).
-   Acceptance criteria
    -   No UI surface shows teammate technical IDs.
    -   When a user triggers “consult teammate”, the prompt/context sent to the teammate includes the introduced system message, description, and profile.
    -   Add tests/fixtures to cover: name normalization + presence of system message/description/profile in the tool invocation payload.
-   Open questions / placeholders (need confirmation)
    -   What is the current data structure for a teammate entity (field names for introduced system message / description / profile)? Use placeholder: @@@
    -   Where in the UI is the teammate displayed (tool picker, chat message, side panel, etc.)? Use placeholder: @@@
    -   Which existing endpoint/function builds the tool schema/payload for “consult teammate”? Use placeholder: @@@
-   Documentation / references
    -   Follow existing Promptbook/Agents Server patterns for how agent source commitments are parsed into model requirements (only if relevant for this change). See: 【some-common-things-about-promptbook.txt】

