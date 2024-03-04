# ✨ Sample: Jokers

-   PTBK URL https://ptbk.example.com/samples/jokers.ptbk.md@v1
-   PTBK VERSION 1.0.0
-   INPUT  PARAMETER {name1} First name or nothing
-   INPUT  PARAMETER {name2} Second name or nothing

<!--Graph-->
<!-- ⚠️ WARNING: This section was auto-generated -->
```mermaid
%% 🔮 Tip: Open this on GitHub or in the VSCode website to see the Mermaid graph visually

flowchart LR
    subgraph "✨ Sample: Jokers"

        direction TB

        input[Input]


        templateQuestion[💬 Question]
        input--"{name1}"-->templateQuestion
        input--"{name2}"-->templateQuestion





    end
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
