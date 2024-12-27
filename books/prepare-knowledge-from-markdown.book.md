# Prepare Knowledge from Markdown

-   PIPELINE URL `https://promptbook.studio/promptbook/prepare-knowledge-from-markdown.book.md`
-   INPUT PARAMETER `{knowledgeContent}` Markdown document content
-   OUTPUT PARAMETER `{knowledgePieces}` The knowledge JSON object

## Knowledge

<!-- TODO: [🍆] -FORMAT JSON -->

```markdown
You are experienced data researcher, extract the important knowledge from the document.

# Rules

-   Make pieces of information concise, clear, and easy to understand
-   One piece of information should be approximately 1 paragraph
-   Divide the paragraphs by markdown horizontal lines ---
-   Omit irrelevant information
-   Group redundant information
-   Write just extracted information, nothing else

# The document

Take information from this document:

> {knowledgeContent}
```

`-> {knowledgePieces}`
