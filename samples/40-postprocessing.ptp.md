# ✨ Sample: Postprocessing 1

Show how to use two consecutive prompts with one parameter each.

-   PTP URL https://ptp.example.com/samples/postprocessing-1.ptp.md@v1
-   PTP version 1.0.0
-   Input parameter `{word}` Any single word

## 💬 Synonym

Synonym for word

-   Postprocessing `unwrapResult`

```text
Write synonym for "{word}"
```

`-> {wordSynonym}`

## 💬 Sentence

Sentence with word and wordSynonym

-   Postprocessing `unwrapResult`
-   Postprocessing `spaceTrim`

```text
Write sentence with "{word}" and "{wordSynonym}" in it
```

`-> {sentenceWithTwoSynonyms}`
