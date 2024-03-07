# ✨ Sample: Jokers

-   PROMPTBOOK URL https://promptbook.example.com/samples/jokers.ptbk.md@v1
-   PROMPTBOOK VERSION 1.0.0
-   MODEL VARIANT Chat
-   MODEL NAME `gpt-3.5-turbo`
-   INPUT  PARAMETER {name1} First name or nothing
-   INPUT  PARAMETER {name2} Second name or nothing
-   OUTPUT PARAMETER `{name}`

<!--Graph-->
<!-- ⚠️ WARNING: This section was auto-generated -->

```mermaid
%% 🔮 Tip: Open this on GitHub or in the VSCode website to see the Mermaid graph visually

flowchart LR
  subgraph "✨ Sample: Jokers"

      direction TB

      input((Input)):::input
      templateQuestion(💬 Question)
      input--"{name1}"-->templateQuestion
      input--"{name2}"-->templateQuestion

      templateQuestion--"{name}"-->output
      output((Output)):::output

      classDef input color: grey;
      classDef output color: grey;

  end;
```

<!--/Graph-->

## 💬 Question

-   JOKER {name1}
-   JOKER {name2}
-   EXPECT MIN 2 WORDS

```markdown
Write some name for hero
```

-> {name}
