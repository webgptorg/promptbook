# ✨ Sample prompt

Show how to use a simple prompt with one parameter.

-   PIPELINE URL https://promptbook.studio/samples/single.ptbk.md
-   PROMPTBOOK VERSION 1.0.0
-   INPUT  PARAMETER `{word}` Any single word
-   OUTPUT PARAMETER `{wordSynonym}`

<!--Graph-->
<!-- ⚠️ WARNING: This section was auto-generated -->

```mermaid
%% 🔮 Tip: Open this on GitHub or in the VSCode website to see the Mermaid graph visually

flowchart LR
  subgraph "✨ Sample prompt"

      direction TB

      input((Input)):::input
      templateSynonym("💬 Synonym")
      input--"{word}"-->templateSynonym

      templateSynonym--"{wordSynonym}"-->output
      output((Output)):::output

      click templateSynonym href "#synonym" "💬 Synonym";

      classDef input color: grey;
      classDef output color: grey;

  end;
```

<!--/Graph-->

## 💬 Synonym

Synonym for word

-   PERSONA Joe, a linguist
-   EXPECT MIN 1 WORD <!-- <- TODO: [🧠] Allow expectations to be relative to "EXPECT MIN countWords({word})" or simpler "EXPECT +-20% OF {word}" -->
-   EXPECT MAX 5 WORDS

```text
Write synonym for "{word}"
```

`-> {wordSynonym}`
