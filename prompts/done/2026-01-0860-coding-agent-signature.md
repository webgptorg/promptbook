[x] ~$0.78

[✨✔️] Coding agent should sign the done prompt.

-   Coding agent script checks the tick and put a price, also add which coding runner and model was used.
-   For example "[x] ~$1.88" -> "[x] ~$1.88 by Claude code `claude-sonnet-4.5`"
-   For example "[ ] ~$0.00" -> "[ ] ~$0.00 by OpenAI Codex `gpt-5.2-codex`"
-   For example "[ ] ~$0.00" -> "[ ] ~$0.00 by Gemini CLI" (unknown model)
-   Now it shows just the price without the model and coding runner.
-   If you cannot determine the coding runner or model, just put "unknown".
-   Put information you know after the price, separated by "by" in one line
-   Do not change the script in any other way, just add this information.
-   This is relavant for every coding agent runner
-   You are working with the [coding agent script](./scripts/run-codex-prompts/run-codex-prompts.ts)
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨✔️] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨✔️] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨✔️] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

