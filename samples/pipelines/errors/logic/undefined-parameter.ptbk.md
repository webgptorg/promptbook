# 🟡 Sample of logic error

Sample of wrong pipeline with parameter {word} that is not defined

-   MODEL VARIANT Chat
-   MODEL NAME `gpt-3.5-turbo`
-   OUTPUT PARAMETER `{sentenceWithTwoSynonyms}`
-   OUTPUT PARAMETER `{wordAntonym}`

## Sentence

Sentence with word and wordSynonym

```text
Write sentence with "{word}" and "{wordSynonym}" in it
```

`-> {sentenceWithTwoSynonyms}`

## Antonym

Synonym for word

```text
Write antonym for "{word}"
```

`-> {wordAntonym}`
