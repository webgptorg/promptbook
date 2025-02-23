<!--⚠️ WARNING: This code has been generated so that any manual changes will be overwritten-->

# `POSTPROCESS` Command

Defines the postprocess function to be used on the result from LLM and before the result is validated

## Example usage

```
- POSTPROCESS unwrapResult
```

## ✂️ Postprocessing

Large language models often give you what you need BUT not exactly what you need.

Promptbook offers a set of useful ready-made functions to fix this problem, you can use them in Promptbooks or separately in any Typescript/Javascript project via [package @promptbook/utils](https://www.npmjs.com/package/@promptbook/utils).

## Example

```
The greeting for your customer is "Hello Pavol".
```

BUT you only need `Hello Pavol`.

---

See also 🧪 Expectations https://github.com/webgptorg/promptbook/discussions/30

_[All commands](../README.md)_ | _[Edit source](https://github.com/webgptorg/promptbook/discussions/31)_ | _[Discuss](https://github.com/webgptorg/promptbook/discussions/31)_
