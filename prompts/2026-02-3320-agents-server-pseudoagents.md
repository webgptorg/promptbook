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

[x] ~$0.4943 35 minutes by OpenAI Codex `gpt-5.3-codex`

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

**But instead it should create a system message:**

```
You are Interacting with User

## Language:
Čeština
<- You are speaking theese languages in your responses to the user.

## Teammates:

Ask John Green for everything. Always asks him in English

1) John Green toolname `team_chat_john_green_422743b849`
```

**With tools:**

```json
{
    // ...
    "tools": [
        {
            "name": "team_chat_john_green_422743b849",
            "description": "Consult teammate John Green",
            "parameters": {
                "type": "object",
                "properties": {
                    "message": {
                        "type": "string",
                        "description": "Question to ask John Green."
                    },
                    "context": {
                        "type": "string",
                        "description": "Optional background context for John Green."
                    }
                },
                "required": ["message"]
            }
        }
    ]
}
```

-   DO not expose urls of reference agents; they are not important to be in the system a message.
    -   The only thing important is to interlink the identification in the system message with the identification in the available tools.
-   Also change "pseudo-agent.invalid"
-   Hide that the `{User}` is "User" - use deterministic english name generator (which already exists in the codebase) to generate a random name _(use rest if the `TEAM` commitment content as seed)_, so the agent will talk to "Alice White" instead of "User", "Bob Green" instead of "User", etc. This will make the experience more natural.
-   Remove the "Use when: Use when you n..." section from the tool description, because it is redundant, there should be an overall description taken from the `TEAM` commitment.
-   The tool names should be based on the human-readable (pseudo)names of the team colleagues. Use existing normalization functions.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Use h2 `##` for sections in the system message, like "Language", "Teammates", etc. to make it more readable. Make this a pattern across all the commitments.
-   Do a proper analysis of the current functionality of Referencing Agents and Commitments before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[x] ~$0.2202 12 minutes by OpenAI Codex `gpt-5.1-codex-mini`

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

[x] ~$0.1263 6 minutes by OpenAI Codex `gpt-5.1-codex-mini`

[✨🆘] Simplify pages of Pseudo Agents.

-   For example
    -   https://core.ptbk.io/agents/void
    -   https://core.ptbk.io/agents/user
-   Make these pages much more similar to the normal agent profile page.
-   There shouldn't be any deep technical knowledge about the book language; only the profile page of the pseudo agent.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)

![alt text](prompts/screenshots/2026-02-3320-agents-server-pseudoagents.png)

---

[ ]

[✨🆘] Make pseudo-agent `{null}`

-   It is alias of `{Void}` and behaves the same way as `{Void}`. It is just another name for the same pseudo-agent.
-   This pseudo-agent represents the null, nothingness, it can be used in `FROM` commitment to create an agent that isn't based on any other agent.
-   Keep in mind the DRY _(don't repeat yourself)_ principle, logic for `{Void}` and `{Null}` should be the same, just with different names.
-   Do a proper analysis of the current functionality of pseudo-agents and agent referencing in book language before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🆘] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

