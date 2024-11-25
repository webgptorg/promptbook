# Prepare Title

-   PIPELINE URL `https://promptbook.studio/promptbook/prepare-knowledge-title.book.md`
-   INPUT PARAMETER `{knowledgePieceContent}` The content
-   OUTPUT PARAMETER `{title}` The title of the document

## Knowledge

-   EXPECT MIN 1 WORD
-   EXPECT MAX 8 WORDS

```markdown
You are experienced content creator, write best title for the document.

# Rules

-   Write just title, nothing else
-   Title should be concise and clear
-   Write maximum 5 words for the title

# The document

> {knowledgePieceContent}
```

`-> {title}`
