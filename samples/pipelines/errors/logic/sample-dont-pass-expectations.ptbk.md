# 🟡 Sample: Sample don't pass expectations

-   PIPELINE URL https://promptbook.studio/samples/sample-dont-pass-expectations.ptbk.md
-   PROMPTBOOK VERSION 1.0.0
-   OUTPUT PARAMETER `{name}`

## 💬 Question

-   EXPECT MAX 3 WORDS

```markdown
Write some name for hero
```

`-> {name}`

### Sample Hero

-   SAMPLE

```
John Doe
```

`-> {name}`

### Wrong sample Hero

-   SAMPLE

```
John Doe With More Than 5 Words
```

`-> {name}`
