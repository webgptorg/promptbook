[x] ~$0.00 21 minutes by OpenAI Codex `gpt-5.3-codex`

[✨🆘] Create system of pseudo-agents.

```book
AI Agent

FROM {Void}
PERSONA You are a helpful assistant.
TEAM You can talk with a {lawyer} or {User}.
```

-   So the agent is referenced in the same way as any other agent.
-   The difference is that these agents aren't defined by any book, they are just pseudo-agents that exist only in the context of the agent that references them. They are like imaginary friends that the agent can talk to or use in other commitments referencing them.
-   For now there will be two pseudo agents:
    -   `{User}` which is the user that is talking to the agent, it cannot be used in `FROM` or `IMPORT` commitments, but it can be used in `TEAM` commitment to make the agent talk to the user or reference the user in other commitments, etc.
        -   From the agent point of view, `{User}` has the same role as any other agent referenced in a team commitment. But when the agent is talking to `{User}`, it means that it is talking to the user that is talking to the agent. So popup a modal with a chat interface to talk to the user when the agent is talking to `{User}`. This modal will end after one message.
    -   `{Void}` this represents the void, nothingness, it can be used in `FROM` commitment to create an agent that isn't based on any other agent, but it can also be used in other commitments to reference the void, nothingness, etc.
        -   Here is already a keyword `FROM VOID` used in same way, change it to `FROM {Void}` and make it work the same way as `FROM` commitment with normal agents.
-   Pseudo agents are case insensitive. Similarly to other agents. For example `{User}`, `{user}`, `{USER}` are the same pseudo agent.
-   They can be referenced in any way that normal agents can be referenced. For example `{User}`, or `@User`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[ ]

[✨🆘] Pass extra instructions from `TEAM`

**The Book:**

```book
Interacting with User


LANGUAGE Čeština
TEAM Ask {User} for everything. Always asks him in English

CLOSED
```

**Creates a system message:**

```
You are Interacting with User

Language:
Čeština
<- You are speaking theese languages in your responses to the user.

Teammates:
- User (https://pseudo-agent.invalid/user)
  - Tool: "team_chat_422743b849"
  - When to consult: Use when you need one direct response from the current user.
```

**With tools:**

```json
{
    // ...
    "tools": [
        {
            "name": "team_chat_422743b849",
            "description": "Consult teammate User (https://pseudo-agent.invalid/user).\nUse when: Use when you need one direct response from the current user.",
            "parameters": {
                "type": "object",
                "properties": {
                    "message": {
                        "type": "string",
                        "description": "Question or request to send to the teammate."
                    },
                    "context": {
                        "type": "string",
                        "description": "Optional background context for the teammate."
                    }
                },
                "required": ["message"]
            }
        }
    ]
}
```

@@@
@@@
@@@

-   @@@
-   Also change "pseudo-agent.invalid"
-   Hide that the `{User}` is "User" - use deterministic english name generator (which already exists in the codebase) to generate a random name _(use rest if the `TEAM` commitment content as seed)_, so the agent will talk to "Alice White" instead of "User", "Bob Green" instead of "User", etc. This will make the experience more natural.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[ ]

[✨🆘] Do a profile page of pseudoagents

-   For example
    -   https://core.ptbk.io/agents/void
    -   https://core.ptbk.io/agents/user
-   The agent names are case insensitive
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🆘] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🆘] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
