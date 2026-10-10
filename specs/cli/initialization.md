# Project initialization

[Main specification](../_main.md) · [Dictionary](../dictionary.md)

- `agents/`: Versioned agent Books. Create default roles and helpers without overwriting edits.
- `AGENTS.md`: Project instructions; ordinary versioned context.
- `tasks/` or `--tasks`: Preferred task Books and their accompanying materials.
- `prompts/`: Preserved legacy Markdown task source.
- `prompts/templates/`, `prompts/done/`, `prompts/traces/`: Legacy templates, archive and durable traces; outside the active queue.
- `.promptbook/ptbk-coder/`: Owned locks, recovery journal, occurrence state, temporary check views and internal cache. Operational items are ignored by Git.
- `.promptbook/coder-isolation-worktrees/`: Isolated worktrees, or a documented compatible relocation within `.promptbook`.
- `.env`: Local settings/secrets, ignored. Create examples only, without inventing working credentials.

**New decision:** store durable Book-task traces under `traces/` within their actual task source, keyed by stable ID and occurrence. Preserve legacy trace paths. Operational state and locks are not historical result records and must not be committed.

`init` must be repeatable: preserve edited Books, context, scripts, `.env`, editor settings and templates; add missing files/keys without wholesale overwrites. README/templates must not be runnable tasks. Preserve the ability to add Git ignore, gitattributes and relevant VS Code settings without making execution itself depend on the editor.

Leave an existing `scripts.check` unchanged. If missing, construct it from actual usable project validation scripts in deterministic order and show its scope. Without validation, create a failing setup placeholder rather than a command that always succeeds. Newly generated command invocations use `ptbk` directly, including `ptbk run`, `ptbk fix` and `ptbk plan`. Migrate only exactly recognized generated historical callers to these commands; diagnose custom scripts and workflows without modifying them.

## Related specifications

- [Project paths and task sources](workspace.md)
- [Git preflight](git-preflight.md)
- [Agent Books and context](agent-context.md)
- [Project checks and repairs](checks.md)
