[x] ~$0.4881 an hour by OpenAI Codex `gpt-5.3-codex`

[✨👁] Allow agents to be private, public or unlisted

-   The visibility of the agent is set outside of the agent source, the visibility can be set in the agent context menu or in batch on entire folders. The visibility can be `PRIVATE`, `UNLISTED`, or `PUBLIC`.
-   Make metadata item `DEFAULT_VISIBILITY` for agents in the agent book, which can be set to `PRIVATE`, `UNLISTED`, or `PUBLIC`. When creating a new agent, it will have this default visibility, by default use `UNLISTED`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Do a database migration for this change
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[x] ~$0.3972 13 minutes by OpenAI Codex `gpt-5.1-codex-mini`

[✨👁] Always allow picking all of the visibility options - `PRIVATE`, `UNLISTED`, or `PUBLIC`

-   In the past, there were only two visibility options `PRIVATE` and `PUBLIC`, but it was changed to three visibility options `PRIVATE`, `UNLISTED`, `PUBLIC`.
-   But the UI for changing visibility was not updated, and it still shows only two options `PRIVATE` and `PUBLIC`, and you can only pick one of them, but you should be able to pick any of the three options.
-   Change the buttons which say "Make public" or "Make private" to "update visibility", and there should be a separate model to change this visibility.
-   This is relevant for both Agent Context menu, Folder Context menu and Quick Button on the Agent Card.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)

---

[-]

[✨👁] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨👁] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

