[x][x][x] <- Note: Maybe still not working

[✨🦉] When the `Chat` component is updated (re-rendered), do not blur users text selection

-   By update I mean when new message is added or last incomplete message is updated
-   Now every render causes the text selection to be removed so practically impossible to select and copy some text when chat is going on
-   This is especially important for `MockedChat` and `LlmChat` where messages are updated rapidly, user trying to select text and copy some text in the middle of the conversation of the chat history and its frustrating when the selection is constantly removed
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[-]

[✨🦉] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[-]

[✨🦉] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[-]

[✨🦉] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`
