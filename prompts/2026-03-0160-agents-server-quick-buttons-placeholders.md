[ ]

[✨🍰] Quick button message placeholders (\_\_\_) should ask for values before sending

```book
David the browser

USE BROWSER
USE SEARCH ENGINE
INITIAL MESSAGE

[Test website](?message=Search project of ___)


CLOSED



```

-   Quick buttons in the chat UI can prefill/send a predefined user message to the agent.
-   They are used in `INITIAL MESSAGE` commitment
-   When the quick button message contains one or more placeholder tokens written as 3+ underscores in a row (e.g. `___`, `____`, `_____`), clicking the quick button must NOT send the message immediately.
-   Instead, show a lightweight UI that asks the user to fill in values for each placeholder occurrence and then sends the final interpolated message.
    - Try to reuse existing UI components and keep it simple and intuitive.
-   Placeholder parsing rules:
    -   Treat any run of underscores of length >= 3 as a placeholder token.
    -   Each placeholder occurrence is a separate field, even if multiple placeholders have the same underscore length.
    -   Preserve everything else in the message exactly as authored (including whitespace and punctuation).
-   UX / UI:
    -   After clicking the quick button, open a small modal/popup (or inline prompt) with:
        -   Preview of the template message with placeholders visually highlighted.
        -   Input fields labeled in order: `Placeholder 1`, `Placeholder 2`, ... (or better label @@@).
        -   Primary action: `Send` (disabled until all placeholders are filled).
        -   Secondary action: `Cancel`.
    -   Upon `Send`, replace placeholders in order with provided values and send the resulting message as if the user typed it.
    -   If the quick button message has no placeholders, behavior stays unchanged.
-   Edge cases:
    -   Works with messages containing multiple placeholders.
    -   Works when placeholders are adjacent to other underscores or characters (only runs >= 3 count).
    -   If user closes/cancels, do nothing (do not send partial message).
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🍰] bar

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🍰] bar

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🍰] bar

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)
