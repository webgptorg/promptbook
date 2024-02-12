# ✨ Sample of multidimensional itteration

Show how to use parameters with multiple values that combines in two nested itterations

-   PTBK VERSION 1.0.0

## 🐄 List of animals

-   MODEL VARIANT CHAT
-   MODEL NAME `gpt-3.5-turbo`
-   SPLIT `markdownList`
-   EXPECT MAX 3 WORDS <!-- <- Note: Expectations are performed to each item it a splitted array -->

```text
Write list of 5 animals:
```

`-> {animals}`

## 🏂 List of activities

-   MODEL VARIANT CHAT
-   MODEL NAME `gpt-3.5-turbo`
-   SPLIT `markdownList`
-   EXPECT MAX 5 WORDS <!-- <- Note: Expectations are performed to each item it a splitted array -->

```text
Write list of 10 activities which animals can do:
```

`-> {activities}`

## 📄 Write text

-   SIMPLE TEMPLATE
-   JOIN `markdownList`
-   EXPECT MIN 5 PARAGRAPH <!-- <- Note: Expectations are performed to joined result -->

```text
{animals[i]} does {activities[j]}
```

`-> {story}`

<!--
TODO: [🧠] Figure out less simmilar word for "single", "simple" and "sample"
-->
