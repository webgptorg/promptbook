# ✨ Sample: Knowledge in external website

Show how to use knowledge

-   PIPELINE URL https://promptbook.studio/samples/website-knowledge.ptbk.md
-   INPUT  PARAMETER `{eventTitle}` The event name
-   OUTPUT PARAMETER `{bio}` Bio of Pavol Hejný - speaker at the event
-   KNOWLEDGE https://pavolhejny.com/

## Writing bio

-   EXPECT MIN 1 Sentence

```markdown
You are writing a bio for Pavol Hejný for the event {eventTitle}.

## Rules

-   Write just the bio, nothing else.
-   Write in the third person.
-   Bio is written in the present tense.
-   Bio should be written for event named "{eventTitle}".
-   Use html formatting.
```

`-> {bio}`
