[ ]

[🧩⚡] Agent chat quick action buttons (client-side JS execution)

-   *(@@@@ Written by agent)*
-   In the agent chat UI there are currently “quick buttons” that prefill/send a message into chat.
-   Add a second type of button: `quick action button` (aka `action button`) that looks similar (same shape/placement) but does **not** send a chat message.
-   When clicked, the quick action button executes arbitrary JavaScript code in the user’s browser using the existing JavaScript evaluation/execution engine from Promptbook repository (do **not** use raw `eval`).
    -   Find and reuse the existing JS engine (likely in `packages/javascript` or related package) and run the code through it.
    -   The JS should run in the context of the agent chat page (browser), but must be executed through the engine API.
-   UX/UI:
    -   Quick action button must be visually distinguishable from quick message button.
    -   Use a dark gray / gray tint background with white text (or similar), while preserving the same button shape, size, and placement.
    -   Clicking consumes the button the same way as quick message buttons (e.g. it disappears / becomes disabled according to existing “consumed” behavior).
    -   Add a short tooltip or microcopy on hover/long-press like `Runs an action in your browser` @@@.
-   Data/format:
    -   Extend the current quick button definition format to support two kinds:
        -   `message`: existing behavior with `text` that is sent
        -   `action`: new behavior with `code` (JavaScript source string)
    -   The agent can generate these action buttons in its output in the same place where quick buttons are provided today.
    -   Backward compatible: existing quick buttons continue working without change.
-   Safety & consent (must-have MVP):
    -   Require explicit user intent (click) to run any code.
    -   Before first action execution in a chat/session, show a lightweight confirmation explaining that it will run code locally in the browser, with options:
        -   `Run once`
        -   `Always allow actions from this agent` (persist setting) @@@
        -   `Cancel`
    -   Show an in-chat or toast feedback for success/failure (error message truncated) @@@.
    -   Hard limits to reduce abuse:
        -   Max code length @@@
        -   Execution timeout @@@
-   Example actions supported (non-exhaustive): open popup, trigger printing, copy rich content to clipboard, open `mailto:` link.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
    -   Likely areas: chat UI components rendering quick buttons, message parsing / message metadata transport, and client-side action handling.
-   You are working with the JavaScript engine package in Promptbook:
    -   Investigate [packages/javascript](packages/javascript)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
