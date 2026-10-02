<!-- cspell:ignore pathspecs noninteractive -->

# Workspace Git prerequisite

Every registered Coder workspace action uses `$preflightWorkspaceRepository` before project writes,
Git synchronization, harness setup, execution, or server startup. Command argument validation runs first;
help, version and usage errors do not run preflight. The same helper is available for the subsequent
workspace `ptbk server` entrypoint and its `ptbk coder server` alias.

| Registered action | Policy | Reason |
| --- | --- | --- |
| `ptbk init`, `coder init`, `coder initialize` | Initialization | Explicit authorization to create missing Git metadata, then reuse the existing additive initializer. |
| `coder add` | Potentially mutating | Authors a prompt in the project queue. |
| `coder plan` | Potentially mutating | Creates a planning workspace, runs a harness and saves reviewed PRDs. |
| `coder generate-boilerplates` | Potentially mutating | Generates starter prompt files and scan caches. |
| `coder find-refactor-candidates` | Potentially mutating | Scans source and generates refactor prompts. |
| `coder run` | Potentially mutating | Runs tests and a harness, updates task state and may synchronize Git. |
| `coder ping` | Potentially mutating | May install a harness, augment ignore rules, and create temporary harness artifacts. |
| `coder server` | Potentially mutating | Starts the server and runner; browser edits also mutate PRDs. |
| `coder verify` | Potentially mutating | Updates statuses, writes repair prompts and archives completed files. There is no separate archive action. |
| `coder list` | Read-only | Lists ready prompts and optional runner filters. |
| `coder find-unwritten` | Read-only | Inspects authoring placeholders. |
| `coder find-fresh-emoji-tags` | Read-only | Scans existing tags without writing its optional cache. |
| `coder run --dry-run`, `coder server --dry-run` | Read-only preview | Prints authoring work without installation, writes or server startup. |

Discovery resolves the project directory once and uses Git to find the enclosing working tree, including
linked worktrees and submodules. The project directory stays separate from the repository root: Books,
prompts and initialization artifacts stay in the requested project; Git snapshots and pathspecs use the
repository root. Isolated execution maps that project location into its temporary working tree and copies the
project environment there. Unborn branches are valid. Discovery never requires a remote or a Git identity.

Only genuinely missing repositories may be initialized. Missing Git, bare repositories, broken metadata,
permission errors and ownership failures stop with diagnostics; no global `safe.directory` changes are made.
Damaged inner metadata is rejected even when Git skips it and discovers a valid parent repository.
Read-only operations warn for absent repositories. Other actions ask once in a terminal and continue after
successful initialization. Declining or cancelling stops before normal effects. `--no-questions` and
noninteractive input fail immediately and suggest `ptbk init`, `ptbk coder init`, or `git init`.

Explicit initialization needs no Git confirmation, even with `--no-questions`. Existing Git metadata is reused
without staging, committing or changing configuration. Optional `--auto-pull` runs after Git validation;
`--commit` uses the existing scoped change snapshot, including before the first commit. Unrelated staged,
unstaged and untracked files stay outside initialization commits. Remote synchronization still needs the
user's configured remote and identity. Partial initialization failures report completed setup steps.

Tests use temporary repositories and mocked prompts or harnesses. The packed CLI fixture exercises the
top-level initializer and no-repository recovery outside this monorepo without network access.
