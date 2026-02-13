[x] ~$0.55 27 minutes by OpenAI Codex `gpt-5.1-codex-mini`

[✨⏰] Inline knowledge should behave as a text file.

-   There is a `KNOWLEDGE` commitment in the agent source.
-   The knowledge has two forms: the referencing of the file and the inline form.

```book
AI Agent

KNOWLEDGE https://example.com/knowledge.txt
KNOWLEDGE
This is some inline knowledge.
It can have multiple lines.
It can have any content.
without any links or references to files.
```

-   Now the referenced knowledge is properly placed into the vector store of the agent kit.
-   But the inline knowledge is just placed 1:1 into the system message.
-   There should be no difference between the referenced form and inline form. When you are referencing the text file with the same content, it should have generally the same behavior as the inline content.
-   The inline knowledge should be also placed into the vector store of the agent kit, just like the referenced knowledge.
-   Place it there as a text file.
-   ## This should go through the model requirements [`AgentModelRequirements`](src/book-2.0/agent-source/AgentModelRequirements.ts) `knowledgeSources`.
-   This file will have the name of the first non-empty line of the inline knowledge normalized to the hamburger case. Use the existing normalization function for this normalization.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Keep in mind the separation of concerns principle. There are multiple parts which are independent to each other:
    1. The logic of handling the referenced or in-line knowledge
    2. The logic of placing the knowledge as some standard universal form for any type of AI or LLM provider.
        - In the agent model requirements, we have the `knowledgeSources` which are the URLs. For the inline form, we can leverage the base64 encoded URLs.
    3. The logic of `knowledgeSources` using in the actual LLM SDK, for example in the OpenAI Agent Kit.
    -   Notice that this can be implemented by multiple LLM providers. For example, OpenAI Agent Kit can have different handling of the files in the knowledge sources compared to the Antropic Clause or Google Gemini. The purpose of `AgentModelRequirements` is to make some universal form to be processable by all the LLM providers.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[ ]

[✨⏰] You have changed the [behavior of the inlined knowledge](prompts/2026-02-0840-inline-knowledge.md) but it is not working properly.

-   Change the inlined knowledge in a way that the file isn't Base64 URL encoded, but it is uploaded into the CDN and created a temporary CDN URL.
-   This will be placed into Agent model requirements `knowledgeSources`
-   Keep in mind the DRY _(don't repeat yourself)_ principle, reuse the uploading logic from other places in the project. Do not implement it separately here.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨⏰] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨⏰] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)
