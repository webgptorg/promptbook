[ ]

[✨😥] OpenAI compatibility mode of the agent server should support the `tools`

```bash
$ curl https://chutoo-test.ptbk.io/agents/NybzgAFteBo2zz/api/openai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ptbk_726c2caba55544c385ee389fa4294eb7" \
  -d '{
    "model": "agent:NybzgAFteBo2zz",
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "my_tool",
          "description": "Returns {message, motivation}",
          "parameters": {
            "type": "object",
            "additionalProperties": false,
            "required": ["message", "motivation"],
            "properties": {
              "message": { "type": "string" },
              "motivation": { "type": "number" }
            }
          }
        }
      }
    ],
    "tool_choice": { "type": "function", "function": { "name": "my_tool" } },
    "messages": [
      { "role": "user", "content": "Ahoj" }
    ]
  }'
```

-   The `tools` and `tool_choice` parameters are part of the OpenAI API and allows users to specify the tooling.
-   Promptbook's Agents Server should be able to support the `tools` and `tool_choice` parameters and pass them down to the OpenAI API when making requests. This will allow users to receive responses in the format they expect, improving the usability and flexibility of the agent server.
-   Internally, just proxy this to the OpenAI - Promptbook doesn't need to implement this responsibility, just pass the `tools` and `tool_choice` down the line.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨😥] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨😥] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨😥] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
