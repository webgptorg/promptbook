# Project workspace

[Main specification](../_main.md) · [Storage and Git guide](storage-and-git.md)

A project is an operating-system directory in a Git working tree. The default is the invocation's current working directory; `--path` selects another. Resolve relative CLI paths from the invocation directory and paths in `ptbk.json` from the selected project. Project, enclosing repository and installed package are distinct, including a project inside a repository subdirectory.

The shared [init destination](initialization.md#initial-input-and-destination) and optional [Windows installer](windows-installer.md) propose `<resolved-user-home>/PTBK/project/` and create a child for an accepted new project. That parent is only a filesystem container, not a shared Git repository, configuration scope or global engine workspace. Each child is initialized independently through ordinary `ptbk init`. This convenience default does not restrict manually selected project locations or change CLI path resolution.

## Home directory and shared projects root

Resolve the intended OS account's actual home at runtime through shared platform-aware account/path operations. Do not hardcode `/home/<name>`, `/Users/<name>`, a drive letter or shell-specific tilde expansion. Windows, macOS and Linux may have custom/redirected homes, spaces and Unicode.

The convenience root is exactly `PTBK/project/` beneath that home: uppercase `PTBK`, singular lowercase `project`, one child per independent project. Example paths are `C:\Users\Alice\PTBK\project\demo`, `/Users/alice/PTBK/project/demo` and `/home/alice/PTBK/project/demo`; these illustrate layouts, not account lookup rules. Explicit destinations and existing projects remain unchanged.

On Linux an ordinary launch uses that user's home. A launch through `sudo` on behalf of another user keeps the validated **original invoking user's** home and PTBK project/discovery scope even if the effective process account or `HOME` names root. Direct root launch without an originating non-root sudo user uses root's actual home. Do not guess ownership from CWD or blindly trust an environment-supplied username/path. Diagnose an unresolved intended account/home before creating a project elsewhere.

Init defaults, known-project registry and engine discovery share this identity resolution; detached/recovered launches preserve that intended scope. This grants no extra cross-user or harness/browser account authority. Keep created files/directories usable by their intended owner; elevated creation must not accidentally leave a user's project root-only. Do not recursively change unrelated ownership/permissions.

Validate safe child names, collisions, writability and path/symlink boundaries. Create the container only when needed. The projects container and host registry remain distinct stores even if they share a user-scoped PTBK parent.

## Project-local content

Agents, tasks, chats, context, checks, traces and engine runtime state belong to that selected project. Promptbook uses files/Git, not a database. Project selection is consistent across interfaces. The versioned `ptbk.json` contains defaults, not runtime/evidence storage. Each project directory has at most one [engine owner](locking.md), independently of the number of attached dashboards or package installations.

The explicit exceptions to project selection are **`ptbk dashboard --global`**, which lists/controls the [host-wide known-project registry](global-dashboard.md), and **`ptbk panic`**, which emergency-stops accessible local engines. Both work from any directory without treating the launch directory as a project. Every listed engine still belongs to its own concrete project. There is no global engine or global task workspace.

`agents/`, `tasks/` and `chats/` are conventional Book locations. Kind comes from the opening AGENT/TASK/CHAT, not placement. [Resolution](../book-language/references.md) checks built-in non-agents, nonignored common locations shallow-first, other nonignored project Books and ignored content last. Duplicate names select one Book, with Fixer diagnostics. Hidden definitions are referenceable; Git metadata, `.ptbk/` and root `traces/` evidence are excluded. Hidden/dependency agents are not automatically eligible for ordinary goal discovery. Chatter's promoted human-chat entry is an explicit [picker exception](chat-ui.md), not expanded goal discovery.

`tasks/` is the default executable source, configurable with `--tasks`; `prompts/` supports legacy Markdown. Only top-level task files are executable sources. Placement never turns AGENT/CHAT into a task. Additional Books can be referenceable without joining the executable queue. Templates, archives, traces/assets are not tasks; expanded lookup does not expand execution into dependencies or ignored directories.

`chats/` holds versioned conversations, including user replies, specialist consultations and links. Read/unread markers can be local in `.ptbk/`, but messages are not an anonymous runtime-only request store. See [chats](chats.md).

New task/chat paths use [date-leading filenames](generated-names.md#filenames-remain-storage-names), independently of creation text in their declarations. Path collisions and normalized-name collisions are checked separately. A source move/rename without a declaration change preserves logical name/kind, though eligibility/precedence may change. Existing files are not bulk-renamed and agent filename policy is unchanged.

`specs/` holds project specifications. Init preserves accepted original input verbatim in `specs/_initial.md` with local linked assets and one ordinary Expert bootstrap referring to it. This is project material, not a copy of engine specifications or an executable task source.

Root **`traces/<task-file-basename>/`** holds [task evidence](traces.md), independent of task-source location. Copy the actual source filename literally without final `.book` or legacy `.md`, not the normalized TASK name. It contains available harness output, events and enabled browser video, with declared name/source-revision provenance. Rename/collision/history handling follows trace rules. [Git policy](trace-configuration.md) can include/ignore traces and independently exclude videos; they are not unconditionally `.ptbk/` runtime data. Evidence copies never become Book definitions.

An implicit missing task source is empty; an explicit invalid source is an error. Init/migration may create their destination. Spaces, nested projects and equivalent paths must work without duplicate discovery. Mutations and lookup must not escape project boundaries through relative paths/symlinks. Explicit [nested setup](nested-projects.md) authorizes only its stated parent Git metadata changes.

`.ptbk/wallet/` holds encrypted project login records and `.ptbk/encryption/` holds persistent encrypted-key/recovery metadata. Both remain ignored but travel with a full project-folder backup. A host-protected automatic unlock secret is the explicit external exception; restoration on another host uses 12 recovery words under [project encryption](project-encryption.md). Never discard these directories during cache cleanup or ordinary engine recovery.

`.ptbk/` holds local ownership/runtime records, system diagnostics, recovery indexes, caches, chat read markers and an explicitly chosen isolated browser profile, with links to traces. It is ignored but not entirely disposable: preserve sessions, pending questions and recovery evidence. No Promptbook runtime files live directly in `.git`.

OS startup registration and durable host-wide **known-project registry/live discovery metadata** may live outside the project. Retain stopped projects until explicitly forgotten; registry removal preserves their directory/data. Live records identify verified owners. They are distinct from project locks and from a global execution service. Global harness installations/native authentication, the invoked package and managed-global/personal/custom browser profiles are also external; this is not general permission to modify unrelated files or expose credentials. An accepted engine-update rerun may preserve only its bounded [setup draft](updates.md) outside the unfinished destination.

See [Git preflight](git-preflight.md), [browser](browser.md), [installation](installation.md) and [recovery](recovery.md).

Root **`actions/<task-file-basename>/`** holds [external-action audit data](action-log.md), using the exact literal trace basename. One Markdown file describes one remote mutation; zero actions means no task directory. Records are versioned independently of trace settings, excluded from Book discovery/execution, and captured prospectively without historical-task backfill.

Root [`report.book`](project-report.md) is the explicit Chat location/name exception: `CHAT Report`, Chatter alone, all briefs appended without required cleanup. It is discoverable, never executable. Discuss report creates a normal new date-named chat in `chats/` with a copied first Chatter message, rather than adding User to the report feed.
