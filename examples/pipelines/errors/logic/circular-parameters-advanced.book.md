# 🟡 Example of logic error

Example of wrong pipeline with circular parameters dependencies

-   OUTPUT PARAMETER `{word4}`
-   OUTPUT PARAMETER `{word2antonym}`

## Word 1

Synonym for word

```text
Write synonym for "{word4}"
```

`-> {word1}`

## Word2

Synonym for word

```text
Write synonym for "{word1}"
```

`-> {word2}`

## Anotnym of word 2

Antonym for word

```text
Write antonym for "{word2}"
```

`-> {word2antonym}`

## Word 3

Synonym for word

```text
Write synonym for "{word2}"
```

`-> {word3}`

## Word 4

Synonym for word

```text
Write synonym for "{word3}"
```

`-> {word4}`
