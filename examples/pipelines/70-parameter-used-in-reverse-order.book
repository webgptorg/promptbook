# ✨ Example of logic error

Example of using parameter in reverse order

_Note: This is not recommended but it should work_

-   PIPELINE URL https://promptbook.studio/examples/parameter-used-in-reverse-order.book.md
-   INPUT  PARAMETER `{word}` Any single word
-   OUTPUT PARAMETER `{sentenceWithTwoSynonyms}`

<!--Graph-->
<!-- ⚠️ WARNING: This code has been generated so that any manual changes will be overwritten -->

```mermaid
%% 🔮 Tip: Open this on GitHub or in the VSCode website to see the Mermaid graph visually

flowchart LR
  subgraph "✨ Example of logic error"

      direction TB

      input((Input)):::input
      sentence("Sentence")
      input--"{word}"-->sentence
      synonym--"{wordSynonym}"-->sentence
      synonym("Synonym")
      input--"{word}"-->synonym

      sentence--"{sentenceWithTwoSynonyms}"-->output
      output((Output)):::output

      click sentence href "#sentence" "Sentence";
      click synonym href "#synonym" "Synonym";

      classDef input color: grey;
      classDef output color: grey;

  end;
```

<!--/Graph-->

## Sentence

Sentence with word and wordSynonym

```text
Write sentence with "{word}" and "{wordSynonym}" in it
```

`-> {sentenceWithTwoSynonyms}`

## Synonym

Synonym for word

```text
Write synonym for "{word}"
```

`-> {wordSynonym}`
