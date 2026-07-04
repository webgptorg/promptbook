[x] ~$0.6557 11 minutes by OpenAI Codex `gpt-5.3-codex`

[✨ 🉐] Add toolcalls into the self-learning samplings

-   When the agent is doing self-learning, we want to have the toolcalls and thinking in the samplings, not only the messages.
-   Purpose of this is to have more data for the analysis of the self-learning, and also to be able to use this data for training in the future.
    -> We want to have the full picture of what the agent was doing in the self-learning, not only the input and output

**Now it is sampling:**

```book
USER MESSAGE
...

AGENT MESSAGE
...
```

**It should do:**

_(record all toolcalls requests+responses, thoughts, messages in the self-learning samplings)_

```book
USER MESSAGE
...

INTERNAL MESSAGE
{...}
{...}

AGENT MESSAGE
...
```

-   Create `INTERNAL MESSAGE` commitment
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of the self-learning samplings before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨ 🉐] qux

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨ 🉐] qux

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨ 🉐] qux

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

