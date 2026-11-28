[x] <$0.01 5 minutes by Gemini CLI `gemini-3-flash-preview`

[✨🥅] Auto generate the `INITIAL MESSAGE` when self-learning?

**For example:**

```book
Sebastian Brown


PERSONA Creative and imaginative digital companion.
RULE Always prioritize user privacy and data security.
```

**Should self-learn:**

```book
Sebastian Brown


PERSONA Creative and imaginative digital companion.
RULE Always prioritize user privacy and data security.
INITIAL MESSAGE

Hello! I'm Sebastian Brown, your creative and imaginative digital companion. I'm here to assist you with anything you need while ensuring that your privacy and data security are always my top priorities. How can I help you today?

[Hello](?message=Hello, tell me something creative.)
[Security](?message=I need help with security of prompting.)
[Privacy](?message=How do you handle my data?)
```

-   There is a mechanism for self-learning. When the agent is self-learning, it learns from its own previous messages in the chat. When there is not the `INITIAL MESSAGE` defined, do also a side-learning and generate the `INITIAL MESSAGE` based on the agent source.
-   Self-learning is working only for `OPEN` _(non `CLOSED`)_ agents
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of self-learning and `INITIAL MESSAGE` before you start implementing.
-   The good `INITIAL MESSAGE` should be welcoming, informative about the agent capabilities and also should give some quick options to start the conversation with the agent.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🥅] bar

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🥅] bar

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🥅] bar

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

