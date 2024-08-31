# ✨ Sample: Language Capabilities

Trying the language capabilities of GPT models.

-   PIPELINE URL https://promptbook.studio/samples/advanced.ptbk.md
-   PROMPTBOOK VERSION 1.0.0
-   INPUT  PARAMETER `{word}` The word to use in the prompt.
-   OUTPUT PARAMETER `{comparisonOfTwoSentences}` Comparison between two sentences
-   OUTPUT PARAMETER `{summary}` The overall summary of the comparison
-   OUTPUT PARAMETER `{wordSynonymTested}`

<!--Graph-->
<!-- ⚠️ WARNING: This code has been generated so that any manual changes will be overwritten -->

```mermaid
%% 🔮 Tip: Open this on GitHub or in the VSCode website to see the Mermaid graph visually

flowchart LR
  subgraph "✨ Sample: Language Capabilities"

      direction TB

      input((Input)):::input
      templateSynonym("💬 Synonym")
      input--"{word}"-->templateSynonym
      templateTestThatWordIsNotOriginalWord("⚙ Test that word is not original word")
      input--"{word}"-->templateTestThatWordIsNotOriginalWord
      templateSynonym--"{wordSynonym}"-->templateTestThatWordIsNotOriginalWord
      templateSentenceWithSynonym("💬 Sentence with Synonym")
      input--"{word}"-->templateSentenceWithSynonym
      templateSynonym--"{wordSynonym}"-->templateSentenceWithSynonym
      templateSentenceWithoutOriginalWord("💬 Sentence without original word")
      templateSentenceWithSynonym--"{sentenceWithTwoSynonyms}"-->templateSentenceWithoutOriginalWord
      input--"{word}"-->templateSentenceWithoutOriginalWord
      templateComparison("💬 Comparison")
      templateSentenceWithSynonym--"{sentenceWithTwoSynonyms}"-->templateComparison
      templateSentenceWithoutOriginalWord--"{sentenceWithOriginalWordRemoved}"-->templateComparison
      templateSummary("🔗 Summary")
      input--"{word}"-->templateSummary
      templateSynonym--"{wordSynonym}"-->templateSummary
      templateSentenceWithSynonym--"{sentenceWithTwoSynonyms}"-->templateSummary
      templateSentenceWithoutOriginalWord--"{sentenceWithOriginalWordRemoved}"-->templateSummary
      templateComparison--"{comparisonOfTwoSentences}"-->templateSummary

      templateComparison--"{comparisonOfTwoSentences}"-->output
      templateSummary--"{summary}"-->output
      templateTestThatWordIsNotOriginalWord--"{wordSynonymTested}"-->output
      output((Output)):::output

      click templateSynonym href "#synonym" "💬 Synonym";
      click templateTestThatWordIsNotOriginalWord href "#test-that-word-is-not-original-word" "⚙ Test that word is not original word";
      click templateSentenceWithSynonym href "#sentence-with-synonym" "💬 Sentence with Synonym";
      click templateSentenceWithoutOriginalWord href "#sentence-without-original-word" "💬 Sentence without original word";
      click templateComparison href "#comparison" "💬 Comparison";
      click templateSummary href "#summary" "🔗 Summary";

      classDef input color: grey;
      classDef output color: grey;

  end;
```

<!--/Graph-->

## 💬 Synonym

Synonym for word

-   PERSONA Joe, a linguist
-   MODEL NAME `gpt-3.5-turbo`
-   POSTPROCESSING `unwrapResult`
-   EXPECT EXACTLY 1 WORD

```text
Write synonym for "{word}"
```

`-> {wordSynonym}`

## ⚙ Test that word is not original word

-   SCRIPT TEMPLATE

```javascript
if (word !== '' && wordSynonym === word) {
    throw new Error(`Synonym returned from LLM is same as original word "${word}"`);
}

return wordSynonym;
```

`-> {wordSynonymTested}`

## 💬 Sentence with Synonym

Sentence with word and wordSynonym

-   PERSONA Jane, a linguist
-   MODEL NAME `gpt-3.5-turbo`
-   EXPECT MAX 20 WORDS
-   EXPECT EXACTLY 1 SENTENCE

```text
Write sentence with "{word}" and "{wordSynonym}" in it
```

`-> {sentenceWithTwoSynonyms}` Sentence with word and wordSynonym

### Sample of sentence with word and wordSynonym

-   SAMPLE

```text
I was happy and you were joyful!
```

`-> {sentenceWithTwoSynonyms}`

## 💬 Sentence without original word

Sentence "{sentenceWithTwoSynonyms}" without "{word}".

-   PERSONA Josh, a linguist
-   EXPECT MAX 20 WORDS
-   EXPECT EXACTLY 1 SENTENCE

```markdown
Remove word "{word}" from sentence and modify it so that it makes sense:

## Rules:

-   Sentence must be grammatically correct
-   Sentence must make sense after removing the word

## The Sentence:

> {sentenceWithTwoSynonyms}
```

`-> {sentenceWithOriginalWordRemoved}` Sentence with both synomyms but without a original word

## 💬 Comparison

Comparison between "{sentenceWithTwoSynonyms}" and "{sentenceWithOriginalWordRemoved}".

-   PERSONA Alice, a linguist
-   MODEL VARIANT Chat
-   MODEL NAME `gpt-4o`
-   EXPECT MIN 1 SENTENCE
-   EXPECT MAX 5 SENTENCES

```markdown
Write a short comparison of the meaning of the two sentences, writing a maximum of 5 sentences:

## Sentence 1:

> {sentenceWithTwoSynonyms}

## Sentence 2:

> {sentenceWithOriginalWordRemoved}
```

`-> {comparisonOfTwoSentences}` Comparison between two sentences

## 🔗 Summary

-   SIMPLE TEMPLATE

```markdown
You have entered a word **{word}**. For this word the best synonym is **{wordSynonym}**. The sentence with both words is **{sentenceWithTwoSynonyms}**. The sentence without the original word is **{sentenceWithOriginalWordRemoved}**. And the comparison between the two sentences is:

> {comparisonOfTwoSentences}
```

`-> {summary}`

### Sample of summary

-   SAMPLE

```markdown
You have entered a word **happy**. For this word the best synonym is **joyful**. The sentence with both words is **I was happy and you were joyful!**. The sentence without the original word is **I was and you were joyful!**. And the comparison between the two sentences is:

> The sentence with both words is more expressive than the sentence without the original word.
```

`-> {summary}`
