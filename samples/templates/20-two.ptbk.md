# ✨ Sample prompt with two consecutive prompts

Show how to use two consecutive prompts with one parameter each.

-   PTBK URL https://ptbk.example.com/samples/two.ptbk.md@v1
-   PTBK VERSION 1.0.0
-   INPUT  PARAMETER `{word}` Any single word

<!--Graph-->
<!-- ⚠️ WARNING: This section was auto-generated -->
```mermaid
%% 🔮 Tip: Open this on GitHub or in the VSCode website to see the Mermaid graph visually

flowchart LR
  subgraph "✨ Sample prompt with two consecutive prompts"

      direction TB

      input((Input)):::input
      templateSynonym(💬 Synonym)
      input--"{word}"-->templateSynonym
      templateSentence(💬 Sentence)
      input--"{word}"-->templateSentence
      templateSynonym--"{wordSynonym}"-->templateSentence

      classDef input color: grey;

  end;
```
<!--/Graph-->

## 💬 Synonym

Synonym for word

```text
Write synonym for "{word}"
```

`-> {wordSynonym}`

## 💬 Sentence

Sentence with word and wordSynonym

```text
Write sentence with "{word}" and "{wordSynonym}" in it
```

`-> {sentenceWithTwoSynonyms}`
