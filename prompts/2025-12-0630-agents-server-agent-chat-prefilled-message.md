[ ]

[✨🧕] Remove prefilled message when the message is send

-   There is option to prefill the message in the chat via `?message=...` query parameter
-   It looks like `https://s6.ptbk.io/agents/jiri-jahn/chat?message=Hello%2C%20can%20you%20tell%20me%20about%20yourself%3F`
-   This URL immediately prefills the message input with "Hello, can you tell me about yourself?" and sends it right away
-   But after sending the message, the URL still contains the `?message=...` parameter
-   So if user refreshes the page, the message is prefilled and sent again and again
-   Update the behavior to remove the `?message=...`
-   Do it via history replacement of the URL
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🧕] qux

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🧕] qux

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🧕] qux

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
