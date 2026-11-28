<!--⚠️ WARNING: This code has been generated so that any manual changes will be overwritten-->

# `PERSONA` Command

Persona command is used to specify who the system is, it will be transformed into system message, top_t,...

## Example usage

```
- PERSONA Jane, skilled copywriter
- PERSONA Joe, male 28 years old, programmer
```

## 🤼 Personas

Personas are an abstraction over many of the technical things you need to think about when working with large language models.

-   Choosing the right model (according to capabilities, (human) languages, privacy,...)
-   Set `temperature` and `top_t`
-   Writing a system message
-   When to continue with which chat
-   Adversary checking between personas https://github.com/webgptorg/promptbook/discussions/39
-   When person does not know, he/she can escalate to another (similar concept as Apple Intelligence)
-   Persona can be user itself (this can mitigate PROMPT DIALOGS or/and some async queue to manual process)
-   Persona can be one GPT assistant
-   Anomaly detection for each persona https://github.com/webgptorg/promptbook/discussions/40

# Synatax

```
- PERSON Joe, 33 years old, skilled Typescript programmer who uses technically advanced terms.
```

Create a new one:

```
- PERSON Jane, experienced copywriter who writes perfect copy in French and keeps private information in secret
```

And then just refers to the same person and continues the chat with "him":

```
- PERSON Joe
```

But allow you to override any technical settings:

```
- PERSON Jane
- MODEL NAME `gpt-4o`
```

_[All commands](../README.md)_ | _[Edit source](https://github.com/webgptorg/promptbook/discussions/22)_ | _[Discuss](https://github.com/webgptorg/promptbook/discussions/22)_
