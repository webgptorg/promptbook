[ ]

[✨✨] When the agent is self-learning, put the requested JSON schema if there is some into the samples.

**Current behavior:**

```book
USER MESSAGE
List the key topics and include a short message about them.

AGENT MESSAGE
{
    "topics": [
        "Topic 1",
        "Topic 2",
        "Topic 3"
    ],
    "message": "Here are the key topics and a short message about them."
}
```

**Expected behavior:**

```book
USER MESSAGE
List the key topics and include a short message about them.

NOTE Request was made through OpenAI Compatible API with `response_format` of type `json_schema` with the following schema:
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
  "required": [
    "topics",
    "message"
  ]
}

AGENT MESSAGE
{
    "topics": [
        "Topic 1",
        "Topic 2",
        "Topic 3"
    ],
    "message": "Here are the key topics and a short message about them."
}
```

-   When `response_format` is requested with `json_schema`, the response is in json, but it doesn't record that requested schema in the `USER MESSAGE`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of json schema of OpenAI compatible mode and the self-learning mecganism before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

![alt text](prompts/screenshots/2026-02-3420-agents-server-self-learning-json-schema.png)

---

[-]

[✨✨] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨✨] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨✨] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
