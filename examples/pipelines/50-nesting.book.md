# ✨ Example: Nesting

How block are nested in the promptbook

-   PIPELINE URL https://promptbook.studio/examples/nesting.book.md
-   INPUT  PARAMETER `{word}` The word to use in the prompt.
-   OUTPUT PARAMETER `{poem}`

<!--Graph-->
<!-- ⚠️ WARNING: This code has been generated so that any manual changes will be overwritten -->

```mermaid
%% 🔮 Tip: Open this on GitHub or in the VSCode website to see the Mermaid graph visually

flowchart LR
  subgraph "✨ Example: Nesting"

      direction TB

      input((Input)):::input
      taskSynonym("💬 Synonym")
      input--"{word}"-->taskSynonym
      taskSentence("💬 Sentence")
      input--"{word}"-->taskSentence
      taskSynonym--"{wordSynonym}"-->taskSentence
      taskMakeADocument("Make a document")
      taskSentence--"{sentence}"-->taskMakeADocument

      taskMakeADocument--"{poem}"-->output
      output((Output)):::output

      click taskSynonym href "#synonym" "💬 Synonym";
      click taskSentence href "#sentence" "💬 Sentence";
      click taskMakeADocument href "#make-a-document" "Make a document";

      classDef input color: grey;
      classDef output color: grey;

  end;
```

<!--/Graph-->

## 💬 Synonym

Synonym for word

-   MODEL VARIANT Chat
-   MODEL NAME `gpt-3.5-turbo`
-   POSTPROCESSING `unwrapResult`
-   EXPECT EXACTLY 1 WORD

```text
Write synonym for "{word}"
```

`-> {wordSynonym}`

## 💬 Sentence

Sentence with the both words

-   MODEL VARIANT Chat
-   MODEL NAME `gpt-3.5-turbo`
-   POSTPROCESSING `unwrapResult`
-   EXPECT MIN 1 SENTENCE

```text
Write sentence with "{word}" and "{wordSynonym}"
```

`-> {sentence}`

## Make a document

-   MODEL VARIANT Chat
-   MODEL NAME `gpt-3.5-turbo`
-   POSTPROCESSING `unwrapResult`

```markdown
Write poem with starting sentence:

\`\`\`text
{sentence}
\`\`\`
```

`-> {poem}`
