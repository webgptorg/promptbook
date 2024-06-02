# ✨ Pick the model

Show how to pick exact model

-   PROMPTBOOK URL https://promptbook.example.com/samples/picking-model.ptbk.md@v1
-   PROMPTBOOK VERSION 1.0.0
-   INPUT  PARAMETER `{word}` Any single word
-   OUTPUT PARAMETER `{poem}`

<!--Graph-->
<!-- ⚠️ WARNING: This section was auto-generated -->

```mermaid
%% 🔮 Tip: Open this on GitHub or in the VSCode website to see the Mermaid graph visually

flowchart LR
  subgraph "✨ Pick the model"

      direction TB

      input((Input)):::input
      templateSynonym("💬 Synonym")
      input--"{word}"-->templateSynonym

      templateSynonym--"{poem}"-->output
      output((Output)):::output

      click templateSynonym href "#synonym" "💬 Synonym";

      classDef input color: grey;
      classDef output color: grey;

  end;
```

<!--/Graph-->

## 💬 Synonym

-   MODEL VARIANT Chat
-   MODEL NAME `gpt-4-1106-preview`

Synonym for word

```text
Write poem with word "{word}"
```

`-> {poem}`

<!--
TODO: [🧠] Figure out less simmilar word for "single", "simple" and "sample"
-->
