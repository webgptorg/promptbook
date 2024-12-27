# 🟡 Example of logic error

Example of wrong pipeline with circular parameters dependencies

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
