# Coder planning

Run `ptbk coder init`, then `ptbk coder plan --harness openai-codex` in an interactive terminal.
The editable `agents/planner.book` uses the same implicit Adam inheritance as Developer. An explicit `--agent`
overrides the Book through the shared resolver; planning resolves Books without initializing missing ancestors.

The discussion retains messages, read results and saved paths across topics. Planner proposes changes as data.
The CLI shows exact paths and changed text, then accepts `/save`, `/draft`, `/discard`, or another discussion turn.
EOF and `/exit` discard unsaved proposals. Ctrl+C aborts inference. Saved files remain intact after failures.

New PRDs use the same numbering, emoji tags, priority and template builder as `coder add`. The project-owned common
template is selected when present; `--template` selects another. Drafts use `[-]`, pending tasks use `[ ]`.
Edits replace one unique passage in one pending/draft task body, preserving identity, routing, priority, line endings,
and other sections. Completed work requires a new follow-up task. Concurrent changes invalidate a preview.

The execution boundary belongs to the command. Codex runs in a separate ignored `.promptbook/coder-plan` workspace
with an empty repository root, ignored user configuration/rules, read-only sandboxing and disabled shell, delegation,
plugins, connectors and hooks. Host-mediated list/read/search and fixed read-only Git operations provide context.
No model-supplied command is executed. Older Codex versions lacking the required switches fail closed; unsupported
harnesses are rejected. Authentication uses the installed Codex login. `--model default` uses Codex's built-in default
because user configuration is isolated.

Only the host can save. Writes stay in the active top-level `prompts/` queue, matching the existing queue loader.
Archives, templates, reusable context, agent guidance and ignored Markdown remain available for inspection only.
The host validates every path, rejects links, devices and special Git/shell path characters, checks the
preview against current contents, stages outside the queue, and publishes each file atomically. Emoji previews disable
the shared scanner's cache writes. Staging and commit runtime directories also reject links. A requested Git commit
is restricted to the session's PRD write set; preexisting
dirty PRDs must be revised without `--commit`, and later external edits prevent the session commit. Git sync and push
are opt-in. Ending a conversation never launches the implementation queue.

The fixture tests cover conversations, boundaries, cancellation, Git isolation and local/packed CLI entrypoints.
The package test builds the production entrypoint and asset layout, runs `npm pack`, extracts the archive, supplies
installed dependencies, and runs the real CLI against a mocked Codex installation and terminal. No live model is used.

The Codex invocation uses the documented [configuration isolation switches](https://learn.chatgpt.com/docs/developer-commands?surface=cli)
and [tool configuration](https://learn.chatgpt.com/docs/config-file/config-reference). Required unsupported flags cause startup to fail.
