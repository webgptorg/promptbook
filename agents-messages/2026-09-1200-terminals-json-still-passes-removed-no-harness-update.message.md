# `.vscode/terminals.json` still passes the removed `--no-harness-update` — a human has to replace it

The prompt [`prompts/2026-09-0170-ptbk-coder-no-questions.md`](../prompts/2026-09-0170-ptbk-coder-no-questions.md)
("Add option `--no-questions`") asked for the dev scripts in [`.vscode/terminals.json`](../.vscode/terminals.json) to
be updated together with the CLI. **Everything else in that prompt is implemented, this one file is not**, because
`.vscode/terminals.json` is permission-gated for the coding agent — every write to it is refused as a sensitive file.

## Why this matters right now

`--no-harness-update` was removed without backward compatibility, so Commander rejects it as an unknown option. All
**13** `ptbk coder` dev terminals in `.vscode/terminals.json` (1 `coder ping`, 12 `coder run`) therefore fail
immediately with `error: unknown option '--no-harness-update'` until the flag is replaced.

## The exact change

Replace every occurrence of `--no-harness-update` with `--no-questions`; nothing else in the file changes, and the
behavior stays the same (the harness update check was only ever a question, and `--no-questions` skips it too):

```bash
sed -i 's/--no-harness-update/--no-questions/g' .vscode/terminals.json
```

None of those terminals uses `--no-auto`, so none of them hits the newly refused `--no-auto --no-questions`
combination.

## Recommendation

Apply the one-line replacement by hand, or grant the coding agent write access to `.vscode/terminals.json` so that a
prompt which explicitly asks for it can finish it. The same gate has already blocked earlier harness work which
needed its dev terminals updated, such as
[`prompts/2026-08-0810-ptbk-coder-qwen-code.md`](../prompts/2026-08-0810-ptbk-coder-qwen-code.md), so this is a
recurring cost, not a one-off.
