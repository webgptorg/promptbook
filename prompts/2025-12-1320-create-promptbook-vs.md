[ ]

[✨🦟] Study the repository and create a comparison between Promptbook and other projects.

-   Also look at https://ptbk.io
-   Identify key features, strengths, and weaknesses of each product.
-   Compare Promptbook with other projects, especially projects like ChatGPT, Claude, ChatGPT-Assistance, LangChain, and N8N.
-   Notice that there are two major versions of the Promptbook:
    -   **Pipelines** _(old version, legacy, deprecated)_ - Pipelines which have clear input and output and do multiple LLM calls during the execution of the pipeline.
    -   **Agents** - Agents which have personality, knowledge, rules,... and they are a huge abstraction above the raw models.
    -   Most of the things in the repository are common and used in both of these versions.
    -   Only on the **Agents part** of the Promptbook, pipelines are deprecated and should not be mentioned here in the comparison.
-   For each alternative product, create a separate Markdown file.
-   Include Side-by-Side Comparison section that highlights the differences and similarities in a tabular format.
-   The structure of these files should be:

**For example:**

```markdown
# Promptbook vs ChatGPT

ChatGPT is general-purpose conversational AI developed by OpenAI, designed to assist users across a wide range of topics through natural language interactions. It leverages advanced machine learning techniques to generate human-like responses based on the input it receives.

It has no specific persona, behavior rules, or specialized knowledge sources defined by the user. Its responses are generated based on a vast dataset it was trained on, without any user-defined commitments or capabilities.

## Side-by-Side Comparison

| Promptbook                                                                          | ChatGPT                                                                |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| ✔ Agents with defined personalities and behavior rules                              | ✘ General-purpose AI models                                            |
| ✔ High-abstracted agent architecture for complex interactions                       | ✘ Low-level access to raw models                                       |
| ...                                                                                 | ...                                                                    |
| **Best for:** creating specialized AI agents tailored to specific tasks or domains. | **Best for:** General conversational assistance across various topics. |
```

-   Each comparison should be in its own Markdown file.
-   Put it in `/documents/comparison/*.md`.

---

[-]

[✨🦟] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🦟] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🦟] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`
