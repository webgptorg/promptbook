# ✨ Sample: Language Capabilities

Trying the language capabilities of GPT models.

-   PTBK URL https://ptbk.example.com/samples/language-capabilities.ptbk.md@v1
-   PTBK VERSION 0.1.0 _(requested 1.0.0)_
-   STARTED AT Today at 3:32 PM
-   TOTAL DURATION a few seconds
-   TOTAL COST 0 _(Some cost is unknown)_

## 💬 Synonym

-   MODEL VARIANT CHAT
-   MODEL NAME `gpt-3.5-turbo` (requested `gpt-3.5-turbo`)

### Prompt

```
Write synonym for "cat"
```

### Result

```
feline
```

## 💬 Sentence with Synonym

-   MODEL VARIANT CHAT
-   MODEL NAME `gpt-3.5-turbo` (requested `gpt-3.5-turbo`)

### Prompt

```
Write sentence with "cat" and "feline" in it
```

### Result

```
The cat gracefully prowled through the room, showcasing its innate feline elegance.
```

## 💬 Sentence without original word

-   MODEL VARIANT CHAT
-   MODEL NAME `gpt-3.5-turbo` (requested `gpt-3.5-turbo`)

### Prompt

```
Remove word "cat" from sentence and modify it so that it makes sense:

## Rules:

-   Sentence must be grammatically correct
-   Sentence must make sense after removing the word

## The Sentence:

> The cat gracefully prowled through the room, showcasing its innate feline elegance.
```

### Result

```
The gracefully prowled through the room, showcasing its innate feline elegance.
```

## 💬 Comparison

-   MODEL VARIANT CHAT
-   MODEL NAME `gpt-4` (requested `gpt-4`)

### Prompt

```
Compare meaning of thee two sentences:

## Sentence 1:

> The cat gracefully prowled through the room, showcasing its innate feline elegance.

## Sentence 2:

> The gracefully prowled through the room, showcasing its innate feline elegance.
```

### Result

```
Sentence 1 depicts a scenario where a cat is walking through a room in a graceful and elegant manner, reflecting its inherent qualities typically associated with felines.

Sentence 2 appears to have a missing subject as "The" requires specification. It seems the sentence is trying to depict a similar scenario as Sentence 1 but the omission of "cat" yields it incomprehensible as is.
```
