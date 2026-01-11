[ ]

[✨🚦] Allow to pass files into the `ChatPrompt`

-   You are working with [`Prompt` type](/src/types/Prompt.ts) \
-   Now there is a prompt `content` and `parameters`, add also ability to pass `files` as `Array<File>`
-   The files should be implemented for now only for `OpenAiExecutionTools`
-   Do some sample of passing files in [OpenAI Playground](/src/llm-providers/openai/playground/playground.ts)
-   Add this into [`Prompt` type](/src/types/Prompt.ts)
-   This can be usefull in future in multiple situations:
    -   Adding document as attachement to message to the model
    -   Passing image to image or video generator
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[ ]

[✨🚦] Implement `ChatPrompt.files` for [OpenAiAssistantExecutionTools](/src/llm-providers/openai/OpenAiAssistantExecutionTools.ts)

-   When chatting with OpenAI Assistant allows attaching files to the prompt.
-   This should work for example with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🚦] Implement @@@ for @@@ExecutionTools

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🚦] Implement @@@ for @@@ExecutionTools

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🚦] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🚦] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`
