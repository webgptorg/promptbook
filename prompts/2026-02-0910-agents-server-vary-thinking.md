[x] ~$7.57 12 minutes by OpenAI Codex `gpt-5.1-codex-mini`

[✨🏪] Vary the "Thinking" message

-   The "Thinking" message occures when the agent receives the message but still don't emit any tokens.
-   Allow to configure all the variants Through the metadata `THINKING_MESSAGES`. Similarly to `AGENT_NAMING`
-   By default, we can have 3 variants: `Thinking / Searching for information / Sorting information`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
    -   For example, share the parsing logic with the `AGENT_NAMING`
-   You are working with the [Agents Server](apps/agents-server)

![alt text](prompts/screenshots/2026-02-0910-agents-server-vary-thinking.png)

---

[x] ~$0.21 13 minutes by OpenAI Codex `gpt-5.1-codex-mini`

[✨🏪] Randomly vary the `THINKING_MESSAGES` message.

-   Which is shown when the agent is thinking, it is taken from the metadata `THINKING_MESSAGES` which is a list of messages.
-   Each time the agent receives a message and starts thinking, it should randomly select one of the messages from the `THINKING_MESSAGES` list and display it to the user.
-   BUT vary this also on the fly, keep each message randomly from 1s to 5s and then switch to another message from the list, so the user can see different messages while the agent is thinking.
-   You are working with the [Agents Server](apps/agents-server)

---

[-]

[✨🏪] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🏪] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

