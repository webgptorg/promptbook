[x] ~$2.84 by OpenAI Codex `gpt-5.2-codex`

[✨⛩] Allow to rename agents to some other word.

-   There are many places where there is the word "agent," for example "Local Agents", "Agents from ...", "Add new Agent", "My Agents", etc.
-   For some clients, this word "agent" is misleading or extremely technical and unpleasing.
-   Allow to rename this word "agent" to some other word via metadata configuration, for example to "chatbot", "bot", "assistant", "person", "persona", etc.
-   The renaming should be reflected in all places in the UI where the word "agent"
-   Only if the agent has the word "agent" in its actual name or description, it should NOT be replaced with the new word, for example if the agent is named "Super Agent", it should stay "Super Agent" even if we rename "agent" to "chatbot", but if the agent is named "My Agent", it should be renamed to "My Chatbot".
-   In the metadata configuration, allow to specify both singular and plural form of the word, for example "chatbot/chatbots", "person/personae", etc.
-   Auto capitalize the word if it is at the beginning of the sentence or in titles, for example "Agent" -> "Chatbot", i.e., the capilatilization should not matter in the metadata configuration. Also trim each side of the word to avoid spaces. For example if the metadata configuration is " chatbot / chatbots " is effectively same as "CHATBOT/Chatbots"
-   The metadata configuration should be named `AGENT_NAMING`, and it should be a string in the format `singular/plural`, for example `chatbot/chatbots`. Bu default, it should be `Agent / Agents`.
-   Internally, the agent will be still named "agent", "Remote Agent",... etc.
-   Keep in mind the DRY _(don't repeat yourself)_ principle, Make someone place in the Agent server code that this responsibility will be working.
-   This is relevant only for the Agents server, not for the entire Promptbook.
-   You are working with the [Agents Server](apps/agents-server)

---

[-]

[✨⛩] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨⛩] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨⛩] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

