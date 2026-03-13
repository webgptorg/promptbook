[ ]

[✨🐲] Chat input keybindings (Enter vs Ctrl+Enter) + first-run onboarding

-   In the Agents Server chat input, support both common keybinding modes:
    -   `Enter` sends message, `Ctrl+Enter` inserts newline
    -   `Enter` inserts newline, `Ctrl+Enter` sends message
-   When a user uses the chat for the first time and presses `Enter` (with no stored preference yet), show a non-blocking prompt (look on existing popup prompt components in Agents server) asking which behavior they want.
    -   The prompt must **not** interrupt typing: any further keystrokes must still apply to the textarea/input even while the prompt is visible and chat on the background.
        -   Handle remote browser / automation edge case where `Enter` is pressed and additional characters are typed immediately after; the characters must appear in the input as if no modal/popup captured focus.
    -   The user decision should take effect for subsequent Enter/Ctrl+Enter presses; the first Enter press that triggered the prompt should follow the newly selected mode if feasible, otherwise keep the text unchanged and require a second Enter to send
    -   Provide a clear (and default) “Not now” / dismiss option; if dismissed, do not re-prompt within the same browser session.
-   Persist this setting in the existing user-data mechanism in Agents Server, including for ad-hoc/anonymous users tied to the browser.
    -   Reuse the current persistence mechanism of storing user data
    -   Include migration/default behavior for existing users: default to current behavior (`Enter` sends) unless existing behavior differs (@@@ confirm desired default).
-   The reusable Chat component must not own persistence; instead it must receive behavior via props.
    -   Introduce a prop `enterBehavior: 'SEND' | 'NEWLINE'`, plus support for the secondary binding (`Ctrl+Enter` inverse).
    -   Ensure the component can be used outside Agents Server with zero dependency on Agents Server user settings.
-   Add a new Settings page in Agents Server for “Keybindings” (future-proof for more settings).
    -   Add to the main menu under Settings.
    -   Include a graphical selection UI with visually appealing “key caps” / boxed keys showing `Enter` and `Ctrl+Enter` and the resulting action.
    -   Toggling the setting updates user data and immediately updates chat behavior.
-   UX details:
    -   Prompt text example: “When you press Enter, should we send the message or add a new line?”
    -   Two primary choices, each showing both bindings.
    -   Include a short hint that the Send button always works.
    -   The buttons should be visually nice [Ctrl] + [Enter] in some nice visual appealing boxes
-   Technical considerations:
    -   Do not break IME composition or mobile keyboards (e.g. don’t treat composition Enter as send).
    -   Do not interfere with multiline paste and existing input handling.
-   You are working with the [Agents Server](apps/agents-server)
-   It should work across all chat inputs in Agents Server, for example:
    -   Agent profile page https://pavol-hejny.ptbk.io/agents/5XnBA2HmrLNazF/
    -   Agent chat page https://pavol-hejny.ptbk.io/agents/5XnBA2HmrLNazF/chat
    -   Textarea page https://pavol-hejny.ptbk.io/agents/5XnBA2HmrLNazF/
    -   Any other usage of <Chat/> component that exist or will be added in the future
-   You are working with the <Chat/> component
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🐲] qux

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🐲] qux

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🐲] qux

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)
