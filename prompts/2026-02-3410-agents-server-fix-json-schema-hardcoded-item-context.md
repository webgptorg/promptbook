[x] ~$0.41 4 minutes by OpenAI Codex `gpt-5.2-codex`

---

[ ]

[✨🧊] Agents is responding with json when asked, but not respecting a schema, fix it

```bash
$         curl https://pavol-hejny.ptbk.io/agents/NFR94UDUAHzmAX/api/openai/v1/chat/completions           -H "Content-Type: application/json"           -H "Authorization: Bearer ptbk_05f950e8b3164aa2a5f040ae9c1c3889"           -d '{
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
{"id":"chatcmpl-sh4mnyjwfbb","object":"chat.completion","created":1771856697,"model":"agent:NFR94UDUAHzmAX","choices":[{"index":0,"message":{"role":"assistant","content":"{}"},"finish_reason":"stop"}],"usage":{"prompt_tokens":11,"completion_tokens":0,"total_tokens":11,"details":{"price":{"value":0,"isUncertain":true},"input":{"tokensCount":{"value":11,"isUncertain":true},"charactersCount":{"value":59},"wordsCount":{"value":11},"sentencesCount":{"value":1},"linesCount":{"value":1},"paragraphsCount":{"value":1},"pagesCount":{"value":1}},"output":{"tokensCount":{"value":0,"isUncertain":true},"charactersCount":{"value":2},"wordsCount":{"value":0},"sentencesCount":{"value":1},"linesCount":{"value":1},"paragraphsCount":{"value":1},"pagesCount":{"value":1}}}}}
```

-   When `response_format` is requested with `json_schema`, the response is in json, but it doesn't respect the schema, it just returns empty json `{}`.
-   It MUST respect the schema, and return the content according to the schema.
-   This is standard functionality in OpenAI API, and it is really important for the users to be able to rely on the schema, so it should be fixed as soon as possible.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)

---

[-]

[✨🧊] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🧊] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🧊] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
