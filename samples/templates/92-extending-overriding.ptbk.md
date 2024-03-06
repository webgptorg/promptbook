# ✨ Sample: Language Capabilities

Extending another promptbook in library and overriding some of the templates.

-   EXTENDS https://ptbk.example.com/samples/language-capabilities.ptbk.md@v1
-   PTBK URL https://ptbk.example.com/samples/language-capabilities-extended.ptbk.md@v1

## 💬 Sentence with Synonym _(enhanced)_

Sentence with word and wordSynonym

-   MODEL VARIANT CHAT
-   MODEL NAME `gpt-3.5-turbo`
-   EXPECT MAX 20 WORDS
-   EXPECT EXACTLY 1 SENTENCE

```text
Write sentence which contains word "{word}" and word "{wordSynonym}" in it
```

`-> {sentenceWithTwoSynonyms}` Override the parameter name !!!!

## 🔗 Summary _(enhanced)_

-   SIMPLE TEMPLATE

```markdown
You have entered a word:

**{word}**.

For this word the best synonym is **{wordSynonym}**. The sentence with both words is:

\`\`\`
**{sentenceWithTwoSynonyms}**
\`\`\`

The sentence without the original word is:

\`\`\`
**{sentenceWithOriginalWordRemoved}**
\`\`\`

And the comparison between the two sentences is:

\`\`\`
{comparisonOfTwoSentences}
\`\`\`
```

`-> {summary}`
