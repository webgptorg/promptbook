# ✨ Sample of logic error

Sample of wrong promptbook with circular parameters dependencies

-   MODEL VARIANT Chat
-   MODEL NAME `gpt-3.5-turbo`
-   OUTPUT PARAMETER `{word2}`

## Word1

Synonym for word

```text
Write synonym for "{word2}"
```

`-> {word1}`

## Word2

Synonym for word

```text
Write synonym for "{word1}"
```

`-> {word2}`
