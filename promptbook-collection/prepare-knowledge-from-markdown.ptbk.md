# Prepare Knowledge from Markdown

-   PIPELINE URL `https://promptbook.studio/promptbook/prepare-knowledge-from-markdown.ptbk.md`
-   INPUT PARAMETER `{content}` Markdown document content
-   OUTPUT PARAMETER `{knowledgePieces}` The knowledge JSON object

## Knowledge

-   MODEL VARIANT Chat
-   MODEL NAME `claude-3-opus-20240229`
<!-- TODO: [🍆] -EXPECT JSON -->

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

> {content}
```

`-> {knowledgePieces}`
