# Using ptbk coder

## Project setup

Install with Node 22.13+ in the Node 22 line, or Node 24+, npm 10+, and Git. npm trusted publishing has its own newer npm requirement; the release workflow supplies it through Node 24.

Run `ptbk coder init --path ./project`. The command can initialize Git, including in unattended mode, but does not commit existing files. Repeating initialization preserves edited agent Books, instructions, templates, environment files, and existing scripts. It adds missing local roles and ignore entries. Existing `scripts.check` stays unchanged. A missing check script is assembled from existing validation scripts; a project without validation receives a setup placeholder that fails until configured.

The selected project may be nested in a larger Git checkout. Relative `--path` starts at the invocation directory; relative `--tasks` starts at the selected project. Tasks, context, checks and subprocesses use the selected project. Symlinks cannot redirect task mutations outside it. Only top-level `.book` files in the task source and `.md` files in `prompts/` are discovered. README, archives, templates, traces, ignore markers and unfinished `@@@` work are excluded from execution.

Operational files live in each project’s ignored `.promptbook/ptbk-coder/`; isolation worktrees live inside `.promptbook/`. Related checkout operations share a writer lease at the main Git checkout while keeping their task ledgers separate. Git keeps its own ordinary internal data. Do not manually remove a lease while a worker might be active.

## Task Books and agent Books

An agent defines a role. A task declares `TASK` immediately after its title, a stable ID, a lifecycle and an implementation payload:

```book
Fix CSV export

TASK
META ID csv-export-quoting
STATUS todo
PRIORITY 2
AGENT {../agents/developer.book}
HARNESS openai-codex
AFTER 2026-10-30T09:00:00+01:00

PROMPT
Quote commas, quotes and newlines correctly. Add a regression test.

RULE
Preserve the public API and column names.
```

`META ID` is unique across the project and survives file or title changes. Missing IDs or lifecycle, duplicate IDs, unknown executable controls and invalid schedule syntax block execution. `RULE` and `RUNNER` may repeat. Metadata notes are non-executable. The special `ptbk-task-literal-json` fenced PROMPT contains one JSON string and preserves exact payload bytes, including lines that resemble commitments.

| Setting | Selection rule |
| --- | --- |
| Priority | Highest nonnegative integer first; inclusive min/max filters |
| Equal priorities | Stable normalized relative source path and section/ID |
| `AGENT`, `HARNESS`, `MODEL` | Separate AND requirements; explicit CLI choices take precedence and conflicting tasks are filtered |
| `RUNNER` | OR group of substring selectors over harness, model and agent aliases |
| CLI defaults | Developer agent; harness must be configured or supplied by an eligible task |
| Environment | `PTBK_HARNESS`, `PTBK_MODEL`, `PTBK_THINKING_LEVEL`; explicit CLI wins |

Legacy Markdown sections are separated by a line containing `---`. The first non-empty line controls state: `[ ]` or no marker means todo, `[-]`/`[.]` not-ready, `[^]` in-progress, `[x]` done, `[!]` failed. `!` counts priority. Backtick runner selectors remain OR alternatives. Status changes preserve routing and timing metadata.

```markdown
[ ] !! `gpt` `opus`

Fix CSV quoting and preserve existing column names.
[ ] Include a regression test for embedded commas.
```

A mixed project can keep that file as `prompts/csv-legacy.md` alongside new `tasks/csv-export.book` tasks and `agents/developer.book`. Both source directories feed the same queue; distinct stable IDs keep separate tasks separate. The body checklist above does not change the task lifecycle.

## Timing and recurrence

`AFTER` accepts `YYYY-MM-DD`, or date plus `HH:mm`, optional seconds/fraction, optional `Z` or `±HH:mm`. Use `T` or a space between date and time. Date-only means midnight. Without an offset, the invocation’s captured system IANA timezone applies. Invalid dates and nonexistent or ambiguous DST times require correction or an explicit offset. Eligibility is inclusive at the instant. Dates in prose, URLs, filenames and model IDs do not schedule tasks.

Recurring task Books add, for example, `REPEAT every 1 week`. Fixed positive integer units are seconds, minutes, hours, days and weeks. Accepted forms include `30m`, `24h`, `7d`, `1w`, `every 2 weeks`, `PT30M`, `P7D`, `P1W`. Days are exactly 24 hours; calendar months and years are unsupported.

With AFTER, slots remain anchored to that instant. Without it, activation persists the first anchor under ownership; previews never create it. Downtime coalesces missed slots into one latest due occurrence. A finite run executes each recurring definition at most once. The definition stays `todo` after success. Failed or ambiguous occurrences block further automatic starts until explicit recovery. `STATUS not-ready` pauses new work and `done` retires the definition.

## Checks, commits and recovery

```bash
ptbk coder run --harness openai-codex --check "npm run check" --check-before yes-and-fix
ptbk coder fix --harness openai-codex --check "npm run check"
ptbk coder verify
```

Checks are skipped unless configured. `--check-before yes-and-fail` stops on failure; `yes-and-fix` repairs before entering the normal queue. `fix` checks first and never selects backlog tasks. Healthy fix does not prepare a harness or create an empty commit. `verify` is human review and archival; it does not run checks.

Implementation and checker transformations have separate phase commits, even when both change the same line. Checker commits use `chore: Automatically commit changes made by checks` and report actual command/outcome. A failed check can produce a delta commit without passing validation. Completion is published after required local finalization succeeds. Git hooks and signing remain active. Complete `CODING_AGENT_GIT_NAME`/`CODING_AGENT_GIT_EMAIL` overrides apply per command; signing uses `CODING_AGENT_GIT_SIGNING_KEY` or legacy `CODING_AGENT_GPG_KEY_ID`. Incomplete agent configuration falls back to the user’s Git identity.

Harness attempts and checks run against private snapshots of the project. Their changes are imported only if the live content, HEAD and index still match the captured boundary. A concurrent editor therefore leaves both the user’s live work and the private result available for review. This also keeps checker transformations separate from the version produced by the agent.

Default `--git-changes fail` refuses a dirty tree. `ignore` preserves staged and unstaged baseline changes and stops on overlapping ownership. `continue` requires exactly one proven interrupted task. Automatic `--no-commit` requires `--git-changes ignore`; supervised `--no-auto` permits manual storage. `--auto-pull` and `--auto-push` are opt-in. A failed push leaves local completion intact and records synchronization pending.

`--isolate` creates a sequential per-task worktree and integrates with `git merge --ff-only`. It requires commits and a named source branch. A conflicting integration preserves the worktree for recovery. A worktree provides checkout isolation, not a security sandbox.

```bash
ptbk coder recover TASK_ID
ptbk coder recover TASK_ID --action resume --dry-run
ptbk coder recover TASK_ID --action resume
ptbk coder recover TASK_ID --action retry
ptbk coder recover TASK_ID --action acknowledge
```

Inspect recovery first. Resume uses proven journal boundaries and refuses unproven bytes; retry explicitly repeats failed work; acknowledge accepts failure without claiming success. Never change HEAD/index or remove recovery evidence to make a run appear successful. Reverting individual phase commits does not undo external effects or the unversioned recurrence ledger.

## Migration

```bash
ptbk coder migrate --tasks work-items --dry-run
ptbk coder migrate --tasks work-items
```

Migration is deterministic and offline. Every Markdown section becomes a Book with stable provenance and literal payload. After verifying the entire source file, migration archives the original bytes and prevents both representations from becoming runnable during recovery. It preserves referenced assets and rejects collisions and changed destinations. The default is one scoped local commit; use `--no-commit` to retain changes. Repeating a completed migration does not duplicate tasks. Older ptbk binaries cannot run task Books; downgrade requires restoring original Markdown and reviewing recurrence history.

## Harnesses, planning and TEAM

Supported provider adapters are `openai-codex`, `claude-code`, `github-copilot`, `cline`, `opencode`, `gemini` and `qwen-code`. Install and log into the chosen CLI independently. `ptbk coder --help` shows the single runtime registry and thinking capabilities. Unsupported effort is an error. Provider output does not override a failing exit code, failed turn or signal. Unknown quota and usage stay unknown.

Codex prefers the active account session. Paid API use requires explicit `PTBK_OPENAI_CODEX_USE_API_KEY=1`; credit use requires `--allow-credits`. The coder does not silently switch provider or account. Known secrets are redacted in streams and traces. Only owned subprocess groups are terminated on cancellation.

The currently installed Codex CLI does not advertise a setting that prohibits spending purchased account credits. Coder therefore refuses account inference before any model call unless you explicitly pass `--allow-credits`, even when your account still has included usage. A future CLI that advertises `--no-credits` or `--disable-credits` can run with the default credit prohibition. `forced_login_method=chatgpt` restricts authentication; it does not prove that account credits are disabled. Generated project scripts never add credit authorization automatically. API billing remains a separate explicit opt-in and requires an available API key without an active account session.

Local agent Books support FROM, IMPORT, RULE, KNOWLEDGE and TEAM references resolved from the declaring file. TEAM uses an actual temporary tool bridge. Advisors receive separate roles and cannot claim tasks or commit. Consultations are bounded to five minutes, depth four, 24 calls, and 128,000 response characters.

| Harness | TEAM and read-only advisor capability |
| --- | --- |
| `openai-codex` | Native app-server discovery and read-only tool controls; the account credit policy above also applies. |
| `claude-code` | Native stream control discovery with restricted, tool-only advisor sessions. |
| `github-copilot` | Native SDK protocol discovery and an explicit MCP tool allowlist. |
| `gemini` | ACP startup discovery with native core tools, skills and hooks disabled for advisors. |
| `opencode` | Native MCP discovery and isolated advisor configuration; requires explicit `--model provider/model`. |
| `qwen-code`, `cline` | TEAM is currently refused before primary inference because safe advisor permissions are not established. Ordinary execution requires an agent without TEAM. |

Initialization adds TEAM to Developer and Planner. Therefore Qwen/Cline cannot run those default Books in this prerelease; select a custom Book without TEAM or one of the five TEAM-capable harnesses. All adapters validate the installed CLI's required capabilities before inference. Cline runs against temporary copies of provider credentials/settings so its model selection cannot overwrite the user's native configuration.

Agent Books may select a model with `MODEL NAME model-name` or `MODEL model-name`. CLI/environment and task model choices take precedence. Unsupported executable settings, including temperature and sampling parameters, fail before inference. Binary/PDF knowledge requires a separate reader and is rejected. Agent files are compiled when an attempt starts; that attempt uses an immutable instruction snapshot.

`plan` defaults to Developer or accepts `--agent agents/planner.book`. It currently requires the verified Codex read-only capability. Host-mediated reads expose project context while application writes and shell execution are denied. `/save` writes reviewed ready tasks, `/draft` writes not-ready tasks, `/discard` clears proposals, `/exit` exits. EOF discards unsaved work. Other harnesses explicitly refuse planning until equivalent capabilities exist.

## Persistent mode and output

`ptbk coder server --harness openai-codex` serves `http://127.0.0.1:4441`. It uses the same execution engine, watches for source changes and due work, and stays alive when idle. Browser controls use a session token and local origin validation. Edits use source revision checks and the shared lease. Persistent server rejects finite `--limit`.

Interactive runs provide P pause/resume, S pacing/backoff skip, X finish-and-exit toggle, O normal/raw output, arrows to inspect buffered output, and End to follow live output. Pausing waits for safe phase boundaries. Skipping does not bypass AFTER. Non-TTY and `--no-ui` use plain output. Buffers are bounded; no inferred percentages or costs are shown as measured facts.

Interactive history retains up to 256,000 characters / 2,048 raw chunks and 160 normal entries; an entry is capped at 8,000 characters. A provider process has a 2 MiB output limit, and a journal retains at most 2 MiB of UTF-8 output plus its last 100 provider call records. Truncation is reported. Project journals and immutable occurrence traces retain recovery evidence; they have no automatic expiration. Each task's scheduling ledger keeps its last 100 occurrences. Review completed artifacts before manually removing old traces or journals; preserve unresolved recovery evidence.

Legacy latest traces keep `prompts/traces/<basename>.md`, or `<basename>-<section>.md` for multiple non-empty sections. Existing unproven or user-edited copies are preserved. Each occurrence also receives an immutable trace under its source directory's `traces/<task-id>/`. A trace records the finalization boundary and links its authoritative runtime journal; that journal records the final persistence outcome and completion commit IDs after Git has created them. A failed completion commit cannot be presented as successful persistence in the boundary trace.

Exit codes: 0 successful mode completion (including future-only queue), 1 execution/check/persistence/sync failure, 2 invalid configuration/input, 130 cancellation.

## Releasing

This repository publishes only `ptbk`. `npm run release:preminor` and `release:prerelease` update manifest and lockfile without creating commits or tags. Review and commit through the repository’s normal process, then create a matching `vVERSION` GitHub Release. The `publish.yml` workflow validates the tag, runs all checks via `prepublishOnly`, and publishes the package. Prereleases use `next`, stable releases use `latest`.

A successful publish then verifies the exact registry version, dist-tag and artifact integrity, installs that registry version locally and globally into temporary directories, and checks both executable versions. If publication succeeded but verification failed, run `npm run release:verify`; do not attempt to overwrite the published version.

Configure npm trusted publishing for owner `webgptorg`, repository `promptbook` and workflow filename `publish.yml`. Enable its direct `npm publish` permission; a newly created publisher defaults to staged publishing. Complete its first successful publication within two days or recreate the expired connection. The workflow uses a hosted Node 24 runner, disables release caches, grants OIDC permission and requests provenance. See [npm’s trusted publisher setup](https://docs.npmjs.com/trusted-publishers/).

A publishing-capable `NPM_TOKEN` GitHub Actions secret is a transitional fallback. npm currently plans to remove direct token publishing in January 2027; configure OIDC for continuing automation. See [npm’s token policy](https://docs.npmjs.com/about-access-tokens/). Locally, `npm login` or a supported npm-configured token is required; run `npm run release:publish`. A publish failure does not allocate a new version until necessary. npm package versions cannot be overwritten.

`npm run check` checks types, deterministic task/schedule/Git/harness/terminal fixtures and the actual tarball installed locally and globally into an external fixture, including task execution, checks and phase commits with a harness double. CI runs on macOS and Linux with Node 22 and 24. Real-provider paid calls are separate from these checks. See [compatibility and verification](compatibility.md) for the evidence and limits.

Deferred scope: parallel task workers, unified Agents Server/SQLite, natural-language/event triggers, distributed claims across independent clones, origami avatars, model quota threshold switching and the generic agent marketplace. Test-server database migration needs a separately configured project adapter and is rejected when absent.
