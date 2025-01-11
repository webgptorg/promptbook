# Prepare Title

-   PIPELINE URL `https://promptbook.studio/promptbook/prepare-title.book.md`
-   INPUT PARAMETER `{book}` The book to prepare the title for
-   OUTPUT PARAMETER `{title}` Best title for the book

## Make title

-   EXPECT MIN 1 Word
-   EXPECT MAX 8 Words
-   EXPECT EXACTLY 1 Line

```markdown
Make best title for given text which describes the task:

> {book}

## Rules

-   Write just title, nothing else
-   Title should be concise and clear
-   Title starts with emoticon
```

`-> {title}`
