[x] ~$0.00

[✨🌟] Count the price of OpenAI codex runner

```bash
npx ts-node ./scripts/run-codex-prompts/run-codex-prompts.ts --agent openai-codex

...

Tests:
Tests:
- `npm run test-lint`
- `npm run test-types`
- `npm run test-app-agents-server` (Next build emits `punycode` deprecation warnings)

Next steps:
Next steps:
1) Refresh Agents Server and confirm the console no longer shows the “Maximum update depth exceeded” error.
2) If you want, I can scan other menu-hoisting usage for similar dependency patterns.

tokens used
73,347

Commit message:
...
```

-   Now it shows just ~$0.00 as the price of running the coding agent prompts, but this is not correct.
-   In the case of the sample I gave you, price should be based in "73,347" tokens used.
-   If you cannot count the actual price precisely, just estimate it and mark it as an uncertain value.
-   Do not change the script in any other way, just counting of the price.
-   This is relavant for only OpenAI Codex runner.
-   You are working with the [coding agent script](./scripts/run-codex-prompts/run-codex-prompts.ts)
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

