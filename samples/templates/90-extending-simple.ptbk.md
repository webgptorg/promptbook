# ✨ Sample: Language Capabilities

Extending another promptbook in library - adding one new template.

-   EXTENDS https://ptbk.example.com/samples/language-capabilities.ptbk.md@v1
-   PTBK URL https://ptbk.example.com/samples/language-capabilities-extended.ptbk.md@v1

## 🔗 Extra Summary _(enhanced)_

Just an extra summary, original summary is preserved in parent promptbook.

<!-- TODO: !!!! In execution report, everything else should be marked as from parent in all templates -->

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

`-> {summaryExtra}`
