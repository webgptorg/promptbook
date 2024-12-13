# ⚠ Example of non-recommended syntax

Defining same model name twice is **not recommended** but it is not an error in case of model names are same.

-   OUTPUT PARAMETER `{answer}`

<!--Graph-->
<!-- ⚠️ WARNING: This code has been generated so that any manual changes will be overwritten -->

```mermaid
%% 🔮 Tip: Open this on GitHub or in the VSCode website to see the Mermaid graph visually

flowchart LR
  subgraph "⚠ Example of non-recommended syntax"

      direction TB

      input((Input)):::input
      prompt("💬 Prompt")

      prompt--"{answer}"-->output
      output((Output)):::output

      click prompt href "#prompt" "💬 Prompt";

      classDef input color: grey;
      classDef output color: grey;

  end;
```

<!--/Graph-->

## 💬 Prompt

-   MODEL NAME `gpt-4o`
-   MODEL NAME `gpt-4o`

```
Hello,
What is the answer to the universe?
```

`-> {answer}`
