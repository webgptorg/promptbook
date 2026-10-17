# Project workspace

[Main specification](../_main.md)

A project is an operating-system directory in a Git working tree. The default is the invocation's current working directory; `--path` selects another. Resolve relative CLI paths from the invocation directory and paths in `ptbk.json` from the selected project. The project, enclosing Git repository and installed package are distinct locations, including when the project is a subdirectory of a repository.

All project agents, tasks, chats, context, checks, traces and runtime state belong to that selected project. Promptbook uses files and Git, not a database. Project selection applies consistently to every command/interface. The versioned `ptbk.json` stores [project configuration](configuration.md); it is distinct from runtime and evidence directories.

`agents/`, `tasks/` and `chats/` are conventional Book locations (with nonignored common locations ranked first). See [shared resolution](../book-language/references.md). `agents/` is the preferred agent-Book directory, not the only reference source. The resolver checks built-in non-agents, nonignored common agent/task/chat directories shallow-first, remaining nonignored project Books, and ignored content last. Duplicate names select only one Book, with Fixer diagnostics. Include hidden agent definitions for reference resolution; exclude Git metadata, `.ptbk/` runtime/browser data and root-level `traces/` evidence. [Hidden agents](../agents/core-agents.md) and dependency-provided agents are not automatically selected for ordinary goal discovery merely because they can be resolved.

`tasks/` is the default task source, configurable with `--tasks`; `prompts/` also supports [legacy Markdown tasks](task-markdown.md). Only top-level task files are executable sources. Additional ignored/project Books may be **referenceable** without becoming executable task-queue sources. Templates, archives, traces and accompanying assets are not tasks. Expanded agent lookup must not expand the executable task queue into ignored directories or dependencies.

`chats/` holds versioned `.book` conversations, including replies to agents and links to tasks. Chat read/unread state can be locally stored in `.ptbk/`; no message belongs only to an anonymous request store. See [chats](chats.md).

`specs/` holds the project's specifications. [Initialization](initialization.md) preserves the user's accepted original input in `specs/_initial.md`, with project-local linked assets, and creates an ordinary Expert task referring to it. This is project material, not a copy of the engine's specifications or an executable task source.

Root-level `traces/<name-key>/` holds each task's [audit evidence](traces.md), independently of the configured task-source location. It includes available harness text, event logs and enabled browser video. Its [Git policy](trace-configuration.md) can include or ignore traces and separately exclude videos; do not unconditionally classify all traces as `.ptbk/` runtime data. Trace snapshots never become agent/task/chat definitions through discovery.

An implicit missing task source is empty. An explicit invalid source is an error; initialization and migration may create their destination. Paths with spaces, nested projects and equivalent paths must work without duplicate discovery. Project mutations must not escape the selected workspace through relative paths or symlinks. Reference lookup also stays within its project boundary. Explicit [nested-project setup](nested-projects.md) authorizes only its stated parent Git metadata changes.

`.ptbk/` holds local runtime records, system diagnostics, recovery indexes, caches and an explicitly chosen isolated project browser profile, with links to task evidence in `traces/`. Global Promptbook browser state is OS-user-local, never checked into a project's repository. It is Git-ignored but not entirely disposable: restarts or cache cleanup must not delete sessions, pending questions or recovery evidence. No Promptbook-owned runtime files are stored directly in `.git`.

Operating-system startup registration may live outside the project and points back to it. Global harness installations/native authentication, the actual engine installation and the default **Promptbook-managed global browser profile** (or an explicitly selected user/custom external profile) live outside the workspace; they are not duplicate project runtime stores or general permission to modify unrelated files. An explicitly accepted engine-update rerun may retain only its bounded [setup draft](updates.md) outside the not-yet-initialized destination.

See [Git preflight](git-preflight.md), [browser](browser.md), [installation](installation.md) and [recovery](recovery.md).
