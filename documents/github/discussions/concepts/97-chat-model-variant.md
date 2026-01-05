<!--⚠️ WARNING: This code has been generated so that any manual changes will be overwritten-->

# 🔵 Chat model variant

-   Author: [hejny](https://github.com/hejny)
-   Created at: 8/19/2024, 10:49:00 AM
-   Updated at: 8/19/2024, 11:22:26 AM
-   Category: Concepts
-   Discussion: #97

Chat model variant is a type of [model variants](https://github.com/webgptorg/promptbook/discussions/67).

# Chat model

Chat model responds to your questions, follows the instructions and tries to be your assistant. It is the most popular model, often synonymous with AI or LLMs.

Chat model variant is in its sence [internally emulated](https://github.com/webgptorg/promptbook/discussions/95) by [completion model](https://github.com/webgptorg/promptbook/discussions/96).

# Examples

-   `gpt-4`
-   `gpt-4o`

## Syntax

This model variant is the default, so you do not need to specify it explicitly, but you can specify it in any [LLM template](https://github.com/webgptorg/promptbook/discussions/88) of [.ptbk.md file](https://github.com/webgptorg/promptbook/discussions/85):

```markdown
-   MODEL VARIANT Chat
```

Or you can use [personas](https://github.com/webgptorg/promptbook/discussions/22) that leverage the chat model variant.

```markdown
-   PERSON Jane, experienced copywriter who writes perfect copy in French and keeps private information in secret
```

<!---->
