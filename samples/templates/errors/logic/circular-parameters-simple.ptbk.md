# ✨ Sample of logic error

Sample of wrong prompt template pipeline with circular parameters dependencies

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
