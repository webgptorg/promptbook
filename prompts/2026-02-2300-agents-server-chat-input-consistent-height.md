[ ]

[✨👪] Keep chat "Write a message" input height consistent

-   In the chat UI (Agents Server), the message text input "Write a message..."/input should keep a consistent height across UI states.
-   Current issue: when chat is empty and user starts typing, the text input "Write a message..." height looks ideal; after sending a message (and once messages appear), the text input "Write a message..." becomes taller and the UI looks worse.
-   Fix the layout/CSS so the text input "Write a message..." height stays the same regardless of:
    -   whether there are messages in the thread
    -   whether the user is currently typing
    -   whether there are attachments/toolcall UI elements rendered elsewhere in the chat
-   Define the expected height precisely in code (avoid height being driven by parent container flex/stretching or conditional padding/margins).
-   Ensure the input stays vertically aligned and visually consistent (padding, line-height, border radius, placeholder baseline) between empty vs non-empty chat.
-   Verify on common breakpoints (mobile + desktop) and in both light/dark themes (if applicable) that the height is stable.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server) but the chat component can be independent from agents server, this fix should work regardless of the app which is using the <Chat/> component.
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
