# Prepare Keywords

-   PIPELINE URL `https://promptbook.studio/promptbook/prepare-knowledge-keywords.ptbk.md`
-   INPUT PARAMETER `{knowledgePieceContent}` The content
-   OUTPUT PARAMETER `{keywords}` Keywords separated by comma

## Knowledge

<!-- TODO: [🍆] -FORMAT JSON -->

```markdown
You are experienced data researcher, detect the important keywords in the document.

# Rules

-   Write just keywords separated by comma

# The document

Take information from this document:

> {knowledgePieceContent}
```

`-> {keywords}`
