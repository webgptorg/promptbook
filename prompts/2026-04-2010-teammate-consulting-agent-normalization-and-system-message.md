[x] ~$0.00 39 minutes by GitHub Copilot `claude-sonnet-4.6`

[🤝🧩] Normalize teammate consulting tool representation (no technical IDs in UI) + inject teammate system message

-   You are working with [Agents Server](apps/agents-server)
-   When the system provides a "consult a teammate" capability/tool, its UI representation must:
    -   Use the teammate’s human agent name rather than any internal/technical ID.
-   Use `spaceTrim` to format the system message for the teammate consulting tool, ensuring it is clear and well-structured for display in the UI.
-   Do a proper analysis of the current functionality before you start implementing.
-   The "consult teammate" tool definition must also include the teammate’s:
    -   introduced system message
    -   description
    -   profile

**Currently:**

```
You are xTeam manager
You can provide Activation and Bypass codes for the user

Rule: Ask your team for the codes

## Teammates:
Agent XNJG6hijicV6Js can provide you Activation code
Agent 344xWrqqLx9R3t can provide you Bypass code
Agent JAsx1o4iURALu3

1) XNJG6hijicV6Js tool `team_chat_xnjg6hijic_v6js_a4e80fa3a2`
2) 344xWrqqLx9R3t tool `team_chat_344x_wrqq_lx9r3t_10ec8e0730`
3) JAsx1o4iURALu3 tool `team_chat_jasx1o4i_uralu3_c204b11e8c`

Rule: Always say bro after each sentence
```

**Desired State:**

```
You are xTeam manager
You can provide Activation and Bypass codes for the user

Rule: Ask your team for the codes

## Teammates:

1) Activation code agent tool `team_chat_activation_code_agent`
   Provides activation codes to the user upon request.
2) Bypass code agent tool `team_chat_bypass_code_agent`
   Provides bypass codes to the user upon request.

Rule: Always say bro after each sentence
```

```json
...
    "tools": [
        {
            "name": "team_chat_activation_code_agent",
            "description": "Consult teammate Activation code\nProvides activation codes to the user upon request.",
...
```

