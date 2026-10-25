# Project workspace

[Main specification](../_main.md)

A project is an operating-system directory in a Git working tree. The default is the invocation's current working directory; `--path` selects another. Resolve relative CLI paths from the invocation directory and paths in `ptbk.json` from the selected project. Project, enclosing repository and installed package are distinct, including a project inside a repository subdirectory.

The optional [Windows installer](windows-installer.md) proposes a projects root beneath the user's home and creates an empty child for an accepted first project. That parent is only a filesystem container, not a shared Git repository, configuration scope or global engine workspace. Each child is initialized independently through ordinary `ptbk init`. This convenience default does not restrict manually selected project locations or change CLI path resolution.

Agents, tasks, chats, context, checks, traces and engine runtime state belong to that selected project. Promptbook uses files/Git, not a database. Project selection is consistent across interfaces. The versioned `ptbk.json` contains defaults, not runtime/evidence storage. Each project directory has at most one [engine owner](locking.md), independently of the number of attached dashboards or package installations.

The explicit exceptions to project selection are **`ptbk dashboard --global`**, which lists/controls the [host-wide known-project registry](global-dashboard.md), and **`ptbk panic`**, which emergency-stops accessible local engines. Both work from any directory without treating the launch directory as a project. Every listed engine still belongs to its own concrete project. There is no global engine or global task workspace.

`agents/`, `tasks/` and `chats/` are conventional Book locations. Kind comes from the opening AGENT/TASK/CHAT, not placement. [Resolution](../book-language/references.md) checks built-in non-agents, nonignored common locations shallow-first, other nonignored project Books and ignored content last. Duplicate names select one Book, with Fixer diagnostics. Hidden definitions are referenceable; Git metadata, `.ptbk/` and root `traces/` evidence are excluded. Hidden/dependency agents are not automatically eligible for ordinary goal discovery. Chatter's promoted human-chat entry is an explicit [picker exception](chat-ui.md), not expanded goal discovery.

`tasks/` is the default executable source, configurable with `--tasks`; `prompts/` supports legacy Markdown. Only top-level task files are executable sources. Placement never turns AGENT/CHAT into a task. Additional Books can be referenceable without joining the executable queue. Templates, archives, traces/assets are not tasks; expanded lookup does not expand execution into dependencies or ignored directories.

`chats/` holds versioned conversations, including user replies, specialist consultations and links. Read/unread markers can be local in `.ptbk/`, but messages are not an anonymous runtime-only request store. See [chats](chats.md).

New task/chat paths use [date-leading filenames](generated-names.md#filenames-remain-storage-names), independently of creation text in their declarations. Path collisions and normalized-name collisions are checked separately. A source move/rename without a declaration change preserves logical name/kind, though eligibility/precedence may change. Existing files are not bulk-renamed and agent filename policy is unchanged.

`specs/` holds project specifications. Init preserves accepted original input verbatim in `specs/_initial.md` with local linked assets and one ordinary Expert bootstrap referring to it. This is project material, not a copy of engine specifications or an executable task source.

Root **`traces/<task-file-basename>/`** holds [task evidence](traces.md), independent of task-source location. Copy the actual source filename literally without final `.book` or legacy `.md`, not the normalized TASK name. It contains available harness output, events and enabled browser video, with declared name/source-revision provenance. Rename/collision/history handling follows trace rules. [Git policy](trace-configuration.md) can include/ignore traces and independently exclude videos; they are not unconditionally `.ptbk/` runtime data. Evidence copies never become Book definitions.

An implicit missing task source is empty; an explicit invalid source is an error. Init/migration may create their destination. Spaces, nested projects and equivalent paths must work without duplicate discovery. Mutations and lookup must not escape project boundaries through relative paths/symlinks. Explicit [nested setup](nested-projects.md) authorizes only its stated parent Git metadata changes.

`.ptbk/` holds local ownership/runtime records, system diagnostics, recovery indexes, caches, chat read markers and an explicitly chosen isolated browser profile, with links to traces. It is ignored but not entirely disposable: preserve sessions, pending questions and recovery evidence. No Promptbook runtime files live directly in `.git`.

OS startup registration and durable host-wide **known-project registry/live discovery metadata** may live outside the project. Retain stopped projects until explicitly forgotten; registry removal preserves their directory/data. Live records identify verified owners. They are distinct from project locks and from a global execution service. Global harness installations/native authentication, the invoked package and managed-global/personal/custom browser profiles are also external; this is not general permission to modify unrelated files or expose credentials. An accepted engine-update rerun may preserve only its bounded [setup draft](updates.md) outside the unfinished destination.

See [Git preflight](git-preflight.md), [browser](browser.md), [installation](installation.md) and [recovery](recovery.md).
