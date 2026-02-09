[x] ~$0.00 by Gemini CLI - failed
[x] ~$0.00 by Gemini CLI - failed

---

[ ] (@@@ Maybe working) !!!!!!!!!!!!!!!

[✨🦔] Estimate the price of the Google Gemini coding runner.

-   When the coding agent script is running with `--gemini` runner, the price is always shown as ~$0.00, which is not correct.
-   Try to better estimate the price of the coding runner when using Gemini. It doesn't have to be 100% accurate, but it should be better than $0.00.
-   For example from the logs and amount of text generated, you can estimate how many tokens were generated and then multiply it by the price per token for Gemini.
-   Coding script shouldn't be changed in any other way. It should stay the same, only better reporting of the price in one coding runner.
-   This was already attempted in the previous run but not working
-   You are working with the [coding agent script](./scripts/run-codex-prompts/run-codex-prompts.ts)
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ] !!!

[✨🦔] Enhanced price estimation

-   Better estimate price when using `--agent openai-codex --model gpt-5.1-codex-mini`
-   For model `gpt-5.1-codex-mini` it reported ~@@@ but was really @@@ - divided by @@@
-   The price for the OpenAI codecs should be per model.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨🦔] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨🦔] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)
