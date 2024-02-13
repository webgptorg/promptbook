# ✨ Sample of array parameters

Show how to use parameters with multiple values that are processed in parallel

-   PTBK VERSION 1.0.0

## 🐄 List of animals

-   MODEL VARIANT CHAT
-   MODEL NAME `gpt-3.5-turbo`
-   SPLIT `markdownList`
-   EXPECT MAX 3 WORDS <!-- <- Note: Expectations are performed to each item it a splitted array -->

```text
Write list of 10 animals:
```

`-> {animals}`

## 🔊 Sound of {animals[i]}

-   MODEL VARIANT CHAT
-   MODEL NAME `gpt-3.5-turbo`
-   EXPECT MAX 5 WORDS

```text
What sound does {animals[i]} make?
```

`-> {sounds}`

## 📄 Write text

-   SIMPLE TEMPLATE
-   JOIN `markdownList`

```text
{animals[i]} does {sounds[i]}
```

`-> {story}`

<!--
TODO: [🧠] Figure out less simmilar word for "single", "simple" and "sample"
-->
