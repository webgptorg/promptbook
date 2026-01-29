<!--⚠️ WARNING: This code has been generated so that any manual changes will be overwritten-->

# Enhancing the prompt responses

-   Author: [hejny](https://github.com/hejny)
-   Created at: 11/24/2024, 6:13:20 PM
-   Updated at: 11/24/2024, 6:14:18 PM
-   Category: Concepts
-   Discussion: #183

When you have a simple, single prompt for ChatGPT, GPT-4, Anthropic Claude, Google Gemini, Llama 3, or whatever, it doesn't matter how you integrate it. Whether it's calling a REST API directly, using the SDK, hardcoding the prompt into the source code, or importing a text file, the process remains the same.

But often you will struggle with the **limitations of LLMs**, such as **hallucinations, off-topic responses, poor quality output, language and prompt drift, word repetition repetition repetition repetition or misuse, lack of context, or just plain w𝒆𝐢rd resp0nses**. When this happens, you generally have three options:

1. **Fine-tune** the model to your specifications or even train your own.
2. **Prompt-engineer** the prompt to the best shape you can achieve.
3. Orchestrate **multiple prompts** in a [pipeline](https://github.com/webgptorg/promptbook/discussions/64) to get the best result.

In all of these situations, but especially in 3., the **✨ Promptbook can make your life waaaaaaaaaay easier**.

-   [**Separates concerns**](https://github.com/webgptorg/promptbook/discussions/32) between prompt-engineer and programmer, between code files and prompt files, and between prompts and their execution logic. For this purpose, it introduces a new language called [the **💙 Book**](https://github.com/webgptorg/book).
-   Book allows you to **focus on the business** logic without having to write code or deal with the technicalities of LLMs.
-   **Forget** about **low-level details** like choosing the right model, tokens, context size, `temperature`, `top-k`, `top-p`, or kernel sampling. **Just write your intent** and [**persona**](https://github.com/webgptorg/promptbook/discussions/22) who should be responsible for the task and let the library do the rest.
-   We have built-in **orchestration** of [pipeline](https://github.com/webgptorg/promptbook/discussions/64) execution and many tools to make the process easier, more reliable, and more efficient, such as caching, [compilation+preparation](https://github.com/webgptorg/promptbook/discussions/78), [just-in-time fine-tuning](https://github.com/webgptorg/promptbook/discussions/33), [expectation-aware generation](https://github.com/webgptorg/promptbook/discussions/37), [agent adversary expectations](https://github.com/webgptorg/promptbook/discussions/39), and more.
-   Sometimes even the best prompts with the best framework like Promptbook `:)` can't avoid the problems. In this case, the library has built-in **[anomaly detection](https://github.com/webgptorg/promptbook/discussions/40) and logging** to help you find and fix the problems.
-   Versioning is build in. You can test multiple **A/B versions** of pipelines and see which one works best.
-   Promptbook is designed to use [**RAG** (Retrieval-Augmented Generation)](https://github.com/webgptorg/promptbook/discussions/41) and other advanced techniques to bring the context of your business to generic LLM. You can use **knowledge** to improve the quality of the output.
