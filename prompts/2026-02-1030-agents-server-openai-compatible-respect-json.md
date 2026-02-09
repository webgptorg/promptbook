[x] ~$4.00 20 minutes by OpenAI Codex `gpt-5.1-codex-mini`

---

[x] ~$0.32 12 minutes by OpenAI Codex `gpt-5.1-codex-mini`

[✨🦮] OpenAI compatibility mode of the agent server should respect the `response_format`

```bash
$ curl https://chutoo-test.ptbk.io/agents/NybzgAFteBo2zz/api/openai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ptbk_726c2caba55544c385ee389fa4294eb7" \
  -d '{
    "model": "agent:NybzgAFteBo2zz",
    "response_format": {
      "type": "json_schema",
      "json_schema": {
        "name": "MotivationReply",
        "schema": {
          "type": "object",
          "additionalProperties": false,
          "required": ["message", "motivation"],
          "properties": {
            "message": { "type": "string" },
            "motivation": { "type": "number" }
          }
        },
        "strict": true
      }
    },
    "messages": [
      { "role": "user", "content": "Ahoj" }
    ]
  }'
```

-   The `response_format` parameter is part of the OpenAI API and allows users to specify the desired format of the response. In this case, we want to ensure that the agent server respects this parameter and returns the response in the specified JSON schema format.
-   Promptbook's Agents Server should be able to parse the `response_format` parameter and pass it down to the OpenAI API when making requests. This will allow users to receive responses in the format they expect, improving the usability and flexibility of the agent server.
-   Internally, just proxy this to the OpenAI - Promptbook doesn't need to implement this responsibility, just pass the `response_format` down the line.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🦮] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🦮] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🦮] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)


