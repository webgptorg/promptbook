[ ] !!

[✨🍻] Add `promptSufix` to `AgentModelRequirements`

**The model requirements will look like:**

```json
{
    "systemMessage": "...",
    "promptSufix": "",
    "modelName": "gemini-2.5-flash-lite",
    "temperature": 0.7,
    "topP": 0.9,
    "topK": 50,
    "tools": [
        /* ... */
    ],
    "samples": [
        /* ... */
    ],
    "knowledgeSources": [
        /* ... */
    ]
}
```

-   The `promptSufix` is a string that will be added to the end of the user prompt.
-   It can contain some additional information or important rules passed by commitments.
-   Notice that `systemMessage` vs `promptSufix` are different things. The `systemMessage` is for the system instructions, while the `promptSufix` is appended to the every user prompt.
-   They are both important and kept separate.
-   Purpose of them is to allow to emphasize some important rules or information and place them both in the system message and the prompt.
-   Agent model requirements are like a compiled version of the agent source containing the low-level things like system messages, temperature, model, etc.
-   Now there are two model requirement types you are working with [`AgentModelRequirements`](src/book-2.0/agent-source/AgentModelRequirements.ts), the second one is deprecated.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)
-   It should work in the [Agents Server](apps/agents-server)

---

[-]

[✨🍻] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨🍻] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨🍻] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)
