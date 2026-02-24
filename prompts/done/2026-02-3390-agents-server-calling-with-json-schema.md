[x] ~$0.04 2 minutes by OpenAI Codex `gpt-5.1-codex-mini`

[✨🪗] Into the agent integration page, in the section OpenAI Compatible Mode, add `response_format` type `json_schema`, sample.

-   The agent can respond with a JSON schema, and the server will validate the response against this schema. If the response is not valid, it will be rejected and the agent will be asked to try again.
-   This option is already supported by Promptbook alongside the simple text option.
-   You are now just adding example not implementing the JSON schema format. It is already implemented.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Keep all the existing options, just add another one into the OpenAI Compatible API section.
-   Do a proper analysis of the current functionality of the integration page before you start implementing.
-   You are working with the [Agents Server](apps/agents-server) For example, with page https://pavol-hejny.ptbk.io/agents/hWTMMThSpx6Yk3/integration
-   Add the changes into the [changelog](changelog/_current-preversion.md)

![alt text](prompts/screenshots/2026-02-3390-agents-server-calling-with-json-schema.png)
![alt text](prompts/screenshots/2026-02-3390-agents-server-calling-with-json-schema-1.png)

---

[x] ~$0.39 12 minutes by OpenAI Codex `gpt-5.2-codex`

[✨🪗] In the agent integration page, there is the section OpenAI Compatible Mode with `response_format` type `json_schema` sample, do some modifications to it

Do theese modifications:

1. There are two code samples shown at the OpenAI compatible section. The simple one with "cURL Python SDK JavaScript/TypeScript SDK tabs" and "response*format.type" one
   Create just one code sample with all the options toggable by tabs. So you can switch between simple text response, JSON schema response and maybe in the future more options without the need to have multiple code samples. Keep in mind the DRY *(don't repeat yourself)\_ principle.

2) The second code sample I have referred to in (1) is not showing full curl or other code but just the body, there should be just one code sample with all the options, and when you switch between the tabs, the code sample should change accordingly to show the correct code for that option. Each time the code sample should be 1:1 copyable. Keep in mind the DRY _(don't repeat yourself)_ principle.

3. Change the requested json schema in the sample

**from:**

```json
{
    "type": "object",
    "properties": {
        "summary": {
            "type": "string"
        },
        "confidence": {
            "type": "number"
        }
    },
    "required": ["summary", "confidence"]
}
```

**to:**

```json
{
    "type": "object",
    "properties": {
        "topics": {
            "type": "array",
            "items": {
                "type": "string"
            }
        },
        "message": {
            "type": "string"
        }
    },
    "required": ["topics", "message"]
}
```

-   The agent can respond with a JSON schema, and the server will validate the response against this schema. If the response is not valid, it will be rejected and the agent will be asked to try again.
-   This option is already supported by Promptbook alongside the simple text option.
-   You are now just modifying the code example not implementing the JSON schema format. It is already implemented.
-   Keep all the existing options, just add another one into the OpenAI Compatible API section.
-   Do a proper analysis of the current functionality of the integration page before you start implementing.
-   You are working with the [Agents Server](apps/agents-server) For example, with page https://pavol-hejny.ptbk.io/agents/hWTMMThSpx6Yk3/integration
-   Add the changes into the [changelog](changelog/_current-preversion.md)

![alt text](prompts/screenshots/2026-02-3390-agents-server-calling-with-json-schema-2.png)

---

[x] $0.00 10 minutes by Gemini CLI

[✨🪗] Fix the proper indentation in the samples in OpenAI Compatible API.

**Now it produces such a code samples:**

```
        curl https://pavol-hejny.ptbk.io/agents/NFR94UDUAHzmAX/api/openai/v1/chat/completions \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer ptbk_05f950e8b3164aa2a5f040ae9c1c3889" \
          -d '{
  "model": "agent:NFR94UDUAHzmAX",
  "messages": [
    {
      "role": "user",
      "content": "Hello!"
    }
  ]
}'
```

**Or:**

```
        curl https://pavol-hejny.ptbk.io/agents/NFR94UDUAHzmAX/api/openai/v1/chat/completions \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer ptbk_05f950e8b3164aa2a5f040ae9c1c3889" \
          -d '{
  "model": "agent:NFR94UDUAHzmAX",
  "messages": [
    {
      "role": "user",
      "content": "List the key topics and include a short message about them."
    }
  ],
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "type": "object",
      "properties": {
        "topics": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "message": {
          "type": "string"
        }
      },
      "required": [
        "topics",
        "message"
      ]
    }
  }
}'
```

-   These are technically correct, but not properly indented.
-   Use the `spaceTrim` utility to fix it.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server) with page for example https://pavol-hejny.ptbk.io/agents/NFR94UDUAHzmAX/integration

---

[-]

[✨🪗] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server) with page for example https://pavol-hejny.ptbk.io/agents/NFR94UDUAHzmAX/integration

