[x][x][-][-][-][-]

[✨🌤] Go through the repository and create / update the dictionary.

-   Create a list of important terms, concepts, and definitions related to the project.
-   Notice that there are two major versions of the Promptbook:
    -   **Pipelines** _(old version, legacy, deprecated)_ - Pipelines which have clear input and output and do multiple LLM calls during the execution of the pipeline.
    -   **Agents** - Agents which have personality, knowledge, rules,... and they are a huge abstraction above the raw models.
    -   Most of the things in the repository are common and used in both of these versions.
-   Interlink these concepts via links to other dictionary entries where applicable.
-   Leverage the 💡 emoticons in the dictionary.
-   Look at [things imported from Github](/documents/github) but be aware that it is outdated and incomplete.
-   Look at [Promptbook Whitepaper](/book/ABSTRACT.md)
-   Also look at https://ptbk.io
-   Each entry should include the term, a brief definition, an`d any relevant context or examples:

**For example:**

```markdown
# 🤝 Commitment

A commitment is a special syntax element used in the Promptbook to define specific behaviors or capabilities of an AI agent. Commitments are included in the agent's source code and influence how the agent interacts with users and external systems.

\`\`\`book
John Green

PERSONA You are a friendly and knowledgeable lawyer.
RULE Always provide clear and concise legal advice.
USE BROWSER
KNOWLEDGE https://legal-database.com/
\`\`\`

In this example, the agent "John Green" has several commitments `PERSONA`, `RULE`, `USE BROWSER`, and `KNOWLEDGE`, which define its personality, behavior rules, browsing capability, and knowledge source.

## Examples

-   [🎭 `PERSONA`](./commitments/persona.md) Defines the personality traits of the agent.
-   [💻 `USE BROWSER`](./commitments/use-browser.md) Grants the agent the ability to browse the web for information.
-   [🧠 `KNOWLEDGE`](./commitments/knowledge.md) Provides the agent with specific knowledge bases to draw from.
-   [All Commitments](./commitments/README.md)
```

-   Each term should be in its own Markdown file.
-   Be verbose. Use examples. Explain be helpful. Be structured. Be specific.
-   It should be in English, but when you will be explaining commitment `LANGUAGE`, you can use different languages.
-   Try to be concrete. Do not write terms as "AI agent" or "AI something." Figure out names like John Green, Catherine Brown, and so on. When you are mentioning the books, try writing the concrete professions like "teacher," "programmer," "lawyer," and so on.
-   You can use code blocks _(for example `book`)_ for examples.
-   You can structure the dictionary into multiple folders. For example, groups of terms can be grouped inside its own directory.
-   When you use the directories, in the top of every directory should be a `README.md` file which will summarize all the terms inside serve as the index file.
-   Put it in `/documents/dictionary/**/*.md`.
-   Create brief summary of the dictionary and put it into [`/book/DICTIONARY.md`](./book/DICTIONARY.md), The DICTIONARY.md should serve as the index which will link to all the important and interesting terms in the dictionary. This isntt the full dictionary, just the summary with links to important terms also it isnt replacement for the `README.md` files in the directories it extra summary file which will be auto-imported into the main `README.md` _(the auto-importing is done in another script, do not do it now)_.

---

[-]

[✨🌤] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🌤] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🌤] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`
