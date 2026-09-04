[ ]

[✨🌿] `--model default` for `openai-codex` resolves to `gpt-5.2-codex`, which ChatGPT-account logins reject

```bash
ptbk coder ping --harness openai-codex --model default
ptbk coder run --harness openai-codex --model default
```

**Version:** `ptbk` 0.114.0-26, Codex CLI 0.153.1 logged in with a ChatGPT account (`ptbk-codex-login-method: chatgpt`).

`ptbk coder ping --harness openai-codex --model default` fails with:

```
ERROR: {"type":"error","status":400,"error":{"type":"invalid_request_error","message":"The 'gpt-5.2-codex' model is not supported when using Codex with a ChatGPT account."}}
```

The CLI help lists `default` as a valid OpenAI model example, but internally it maps to `gpt-5.2-codex`. With a ChatGPT login only the models offered in Codex itself work (e.g. the `model` from `~/.codex/config.toml`, here `gpt-5.6-sol`).

**Expected**: `default` should not override the model at all (let Codex use its configured default), or the mapping should depend on the login method.

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing) of needed
-   Add the changes into the [changelog](changelog/_current-preversion.md)
