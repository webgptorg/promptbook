[ ]

[✨👪] Keep chat "Write a message" input height consistent

-   *(@@@@ Written by agent)*
-   In the chat UI (Agents Server), the message composer/input should keep a consistent height across UI states.
-   Current issue: when chat is empty and user starts typing, the composer height looks ideal; after sending a message (and once messages appear), the composer becomes taller and the UI looks worse.
-   Fix the layout/CSS so the composer height stays the same regardless of:
    -   whether there are messages in the thread
    -   whether the user is currently typing
    -   whether there are attachments/toolcall UI elements rendered elsewhere in the chat
-   Define the expected height precisely in code (avoid height being driven by parent container flex/stretching or conditional padding/margins).
-   Ensure the input stays vertically aligned and visually consistent (padding, line-height, border radius, placeholder baseline) between empty vs non-empty chat.
-   Verify on common breakpoints (mobile + desktop) and in both light/dark themes (if applicable) that the height is stable.
-   Add a minimal regression check:
    -   either a lightweight UI test (Playwright) that compares bounding box height before/after first message
    -   or a unit/snapshot test for the composer container classnames/styles (whichever is already used in the project)
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
    -   Likely files/components to inspect and adjust:
        -   [apps/agents-server/src/app/agents/[agentName]/AgentChatWrapper.tsx](apps/agents-server/src/app/agents/[agentName]/AgentChatWrapper.tsx)
        -   [apps/agents-server/src/book-components/chat/Chat/Chat.tsx](src/book-components/chat/Chat/Chat.tsx) @@@ if used/shared
        -   any chat composer component + its CSS modules / Tailwind classes @@@
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨👪] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨👪] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨👪] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)