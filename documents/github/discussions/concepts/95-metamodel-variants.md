<!--⚠️ WARNING: This code has been generated so that any manual changes will be overwritten-->

# ✨ Metamodel (variants)

-   Author: [hejny](https://github.com/hejny)
-   Created at: 8/18/2024, 1:35:06 PM
-   Updated at: 8/20/2024, 10:16:00 AM
-   Category: Concepts
-   Discussion: #95

The metamodel is not a black box model by itself, but some helpful box that is composed of several other models and prompts.

It is closely related to [metaprompting](https://github.com/webgptorg/promptbook/discussions/35).

## 1) One model variant can be emulated by different model variant

One [model variant](https://github.com/webgptorg/promptbook/discussions/67) can be emulated by another. For example, the chat model is emulated in its deep internals by the completion model.

-   Emulating Chat via Completion _(This is how the first version of ChatGPT worked.)_
-   Emulating Translate via Completion
-   Emulating Translate via Chat
-   Emulating Translate via Linguistic Cross-multiplication
-   Emulating Linguistic Cross-multiplication via Completion
-   Emulating Linguistic Cross-multiplication via Chat
-   Emulating Linguistic Cross-multiplication via Translate

## 2) Enhance one model variant by composing metamodel

[Pipelines](https://github.com/webgptorg/promptbook/discussions/64) itseft does exactly that - it combines multiple calls into one big pipeline.

-   Increase capabilities
-   Increase reliability
-   Increase context size

---

-   https://github.com/webgptorg/promptbook/discussions/96
-   https://github.com/webgptorg/promptbook/discussions/97
-   https://github.com/webgptorg/promptbook/discussions/98
-   https://github.com/webgptorg/promptbook/discussions/99
-   https://github.com/webgptorg/promptbook/discussions/100
-   [(All model variants)](https://github.com/webgptorg/promptbook/discussions?discussions_q=label%3A%22Model+variant%22)
