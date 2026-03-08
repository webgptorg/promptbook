[x] ~$0.4538 27 minutes by OpenAI Codex `gpt-5.3-codex`

[✨🍾] Allow sending long initial chat messages from agent profile without URL length limits

-   Currently the agent profile chat transmits the user message via URL query parameter(s), which breaks for long messages due to URL length limits.
-   Change the implementation so the message is transmitted via request body (POST) or other non-URL mechanism, while keeping shareable deep-links working.
-   Add basic abuse protections: max message size limit on server, validation, and clear error message in UI when rejected.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
    -   Reuse existing chat/message tables if already present; do not add new storage unless needed
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🍾] baz

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🍾] baz

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🍾] baz

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)