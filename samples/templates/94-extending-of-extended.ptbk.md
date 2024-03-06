# ✨ Sample: Language Capabilities

Extending another promptbook which is already extended.

-   EXTENDS https://ptbk.example.com/samples/language-capabilities-extended.ptbk.md@v1
-   PTBK URL https://ptbk.example.com/samples/language-capabilities-extended-extended.ptbk.md@v1

## 💬 Sentence without original word

Sentence "{sentenceWithTwoSynonyms}" without "{word}".

-   MODEL VARIANT CHAT
-   MODEL NAME `gpt-3.5-turbo`
-   EXPECT MAX 20 WORDS
-   EXPECT EXACTLY 1 SENTENCE

```markdown
Remove word "{word}" from sentence and modify it so that it makes sense:

> {sentenceWithTwoSynonyms}
```

`-> {sentenceWithOriginalWordRemoved}`
