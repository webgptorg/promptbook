# Prepare Keywords

-   PROMPTBOOK URL `https://promptbook.studio/promptbook/prepare-keywords.ptbk.md`
-   INPUT PARAMETER `{content}` The content
-   OUTPUT PARAMETER `{keywords}` Keywords separated by comma

## Knowledge

-   MODEL VARIANT Chat
-   MODEL NAME `claude-3-opus-20240229`
<!-- TODO: [🍆] -EXPECT JSON -->

```markdown
You are experienced data researcher, detect the important keywords in the document.

# Rules

-   Write just keywords separated by comma

# The document

Take information from this document:

> {content}
```

`-> {keywords}`
