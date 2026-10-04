# run-codex-prompts

`run-codex-prompts.ts` drives the Coding Agent workflow. It loads the `prompts/` tasks, runs them through the selected model runner (OpenAI, Gemini, Claude, etc.), and automatically writes, stages, commits, and optionally pushes the generated files.

## Usage

### Via Promptbook CLI (recommended):

```bash
# External usage (when promptbook is installed globally)
ptbk coder init
ptbk coder run --harness openai-codex
ptbk coder plan --harness openai-codex

# Internal usage (within Promptbook repository)
npx ts-node ./src/cli/test/ptbk.ts coder run --harness openai-codex --model gpt-6-astra
```

`run`, `server` and `plan` use the project's Developer (`agents/developer.book`). Planner remains available
with `--agent ./agents/planner.book`. These editable local Books supply the persona, instructions, inherited Adam rules,
imports, TEAM declarations, display identity and prompt-routing aliases. Local edits apply on the next invocation.
`--harness` selects the coding tool, `--model` selects its model, and `--thinking-level` controls reasoning effort.
An optional `--agent` overrides only the Book for that action:

```bash
ptbk coder run --harness openai-codex --agent agents/my-developer.book
ptbk coder plan --harness openai-codex --agent ./agents/planner.book
```

Book paths may be relative to the current project directory or absolute; quote paths containing spaces.
Missing default Books require `ptbk coder init`. An invalid explicit selection fails without falling back.
`plan` permits only PRD changes even when Developer or another implementation Book is selected.
`coder list` has no default agent filter and lists all ready tasks; `--agent` explicitly filters it.
Listing and dry runs never initialize Books, install a harness or change project files.
Dry-run reports use the selected Book's routing aliases together with the selected harness and model.
New `coder:run` and `coder:plan` scripts rely on these role defaults; repeated init preserves existing scripts,
including custom `--agent` selections.

### Shared project selection and command inventory

These commands select the same project, Book, and additional context:

```bash
ptbk coder run --harness openai-codex
ptbk coder run --harness openai-codex --agent ./agents/developer.book --path . --context ./AGENTS.md
```

`--path` defaults to the working directory captured when the action starts. Relative paths start at that
invocation directory; absolute paths select the directory directly. The directory must already exist and be
readable/searchable. Selecting a nested project does not move Books, AGENTS.md, templates, PRDs, checks or
artifacts to an enclosing Git root. Git preflight and repository operations still use that enclosing working tree.
Harnesses and verification subprocesses receive the selected project as cwd; isolated execution maps project
inputs and PRDs into the worktree while keeping durable temporary logs under the selected original project.

Omitting `--context` reads the selected project's `AGENTS.md` as UTF-8. A missing implicit file produces one
diagnostic and no additional context; an unreadable existing file fails. An explicit inline value or file
**replaces** this selection. Relative files resolve against the selected project. An empty value (`--context ""`)
disables additional context, and an empty file remains empty. Explicit missing/unreadable files fail; spell file
paths with `./`, `../`, an absolute path, or a filename extension such as `.md` to distinguish them from prose.
Book instructions, task content and the selected additional context retain their existing roles; the default
file is not appended after an override. Explicit flags and existing command configuration take precedence over
these fallbacks. There is no new environment-variable precedence layer.

| Registered command                                                                           | Primary Book or filter                                                                      | Project selection                                                    | Additional context                                       |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------- |
| `coder run`, `coder server`                                                                  | Optional `--agent`, default Developer; task/harness targeting still applies                 | `--path`, default invocation cwd                                     | `--context`, default project AGENTS.md                   |
| `coder plan`                                                                                 | Optional `--agent`, default Developer; explicit Planner supported; PRD-only permissions     | Same                                                                 | Same                                                     |
| `coder list`                                                                                 | Optional `--agent` is a **listing filter**; omission lists all agents                       | Same                                                                 | None                                                     |
| `init`, `initialize`, `coder init`, `coder initialize`                                       | Creates/preserves all default Books; selects no primary agent                               | Same, through one initializer                                        | Creates/preserves AGENTS.md; does not load agent context |
| `coder add`, `coder generate-boilerplates`                                                   | Template authoring, no model or primary agent in this version                               | Same; templates are project-relative                                 | None                                                     |
| `coder verify`, `coder find-refactor-candidates`                                             | Queue/archive and scan utilities, no primary agent                                          | Same                                                                 | None                                                     |
| `coder find-unwritten`, `coder find-fresh-emoji-tags`, `coder ping`                          | Inspection or harness diagnostics; no Book persona                                          | Same                                                                 | None                                                     |
| `agent chat`, `agent exec`                                                                   | Existing required `--agent` names the specific Book; remains required                       | Same                                                                 | Same shared context default and override                 |
| `agent-folder init` / `initialize`, `run-once` / `tick`, `run-agent` / `run`, `run-multiple` | Existing folder configuration selects agent Books; multi-agent discovery remains unfiltered | Same; multi-agent discovery scans children of the selected directory | No additional-context option                             |

Help, version, initialization and pure utilities never resolve a default primary Book. `coder run/server --dry-run`
read only the selected Book identity and context for preview; they do not compile inheritance, initialize Books,
install a harness, start the mutable HTTP server or call a model. Missing selected Books still report init guidance.
Legacy pipeline/file commands (`run`, `make`, `prettify`, `test`, `start-pipelines-server`, `start-agents-server`)
retain their operands; those operands are not optional permission to modify Developer. `agents-server` manages the
packaged web application and its existing runtime configuration; it is distinct from the forthcoming workspace server.

The top-level `init` alias already shares this path. The unified top-level `server`, agent-assisted `coder add`,
and repair-only command are not registered in this version. When introduced, their execution/authoring paths should
reuse these services, with Developer for untargeted work and existing explicit configuration preserved. Workspace
server discovery/scheduling must still include all agents. This supersedes only the earlier implicit Planner policy,
not Planner initialization, availability, TEAM, or planning restrictions. Check terminology and repair-only execution
use the shared check contract: `--check`, `--check-before`, and the project-owned `npm run check` command.

### Project checks

`--check` selects one project-owned shell command for post-prompt feedback and, when enabled, initial checks.
`--check-before` retains `no` (default), `yes-and-fail`, and `yes-and-fix`. Enabled preflight with no explicit command
uses `npm run check`. With neither flag, the runner skips these optional phases. A check may include
tests, linting, typechecking, builds, generated-code consistency, and other quality checks.

Initialization preserves `scripts.check` exactly or composes usable existing validation scripts in deterministic
order, reporting the chosen scope. No usable validation produces a failing setup placeholder. Missing, recursive,
or unconfigured validation stops with setup guidance before repair retries. Check feedback fixes underlying
failures and forbids deleting assertions, disabling lint rules, removing checks, lowering thresholds, skipping builds,
or forcing success. Process exits, signals, spawn failures, and cancellation determine the outcome.

Retired `--test` / `--test-before` flags produce errors naming `--check` / `--check-before`. Init migrates exact
generated callers and preserves a legacy aggregate's body in `check`. Existing conflicting/custom entries and
references in other scripts or workflow files remain intact, with manual instructions. Update callers to
`npm run check` and the new flags after preserving the desired validation, then remove unused legacy entries.
Update external verification commands from `npm run test-for-ptbk-coder` to `npm run check` as well. Restart a
running Coder invocation with the new flags because its verification command was captured at startup.

### TEAM consultations

`run` and `plan` expose the effective selected Book's TEAM entries as callable adviser tools, including entries
from `FROM` and `IMPORT`. The primary agent chooses a relevant adviser, sends a question and necessary context,
and receives an attributed answer in the same task. Each adviser runs its own Book, inheritance and imports.
Its rules are not merged into the primary agent, and declaring advisers does not run them automatically.

```book
Developer
TEAM Consult {./lawyer.book} about licensing.
TEAM Ask {Copywriter} to review application wording.
```

The existing Book resolver also supports `@Name`, project paths such as `{agents/lawyer.book}`, and HTTP(S)
Book or agent URLs. Names use first-line Book titles; `./` and `../` paths are relative to the declaring Book,
including inherited declarations. Repeated references to the same Book share one tool; ambiguous names and
missing references produce errors. Prepared fixture or custom Books work without running `coder init`.
Local advisers need no Agents Server. Remote source is read through the existing Book endpoint and compiled
under the caller's execution policy; inaccessible/private sources produce attributed errors. Coder does not
forward local credentials or Agents Server internal-access tokens to remote URLs, and remote Books cannot
reference host-local Books. Agents Server's own remote TEAM execution and access checks are unchanged.

All seven coding harnesses (OpenAI Codex, Claude Code, GitHub Copilot, Cline, OpenCode, Gemini and Qwen Code)
use the same temporary command-tool bridge. The harness verifies discovery before working, calls each
advertised tool through its shell capability, and reads the returned JSON. Disabled command capabilities or
missing bridge connections fail explicitly. This uses the selected harness's existing model, authentication,
permissions and project directory. No extra model call is made for an unused adviser.

Planning currently supports OpenAI Codex only. The primary Book and every nested adviser use the same host-mediated
read protocol and restricted inference process. Even a Developer Book cannot write application files, run
commands or submit its own PRD proposals as a planning adviser. Only the primary agent proposes PRDs,
which retain the normal review and save flow. Other planning harnesses are rejected before execution.

Each consultation belongs to one task/session/invocation, with no shared message or result cache. Calls have
a five-minute timeout, a maximum depth of four, and a total limit of 24 consultations per runtime. Cycles,
unavailable agents, cancellations and malformed answers return attributed errors for the primary agent to
handle; cancellation revokes the delegation tree. Advisers never start a separate queue or automatic Git or
migration workflow. Requests, results, errors and available nested activity join the existing runtime trace;
available usage is aggregated once per inference, retaining uncertainty when a harness cannot report it.

### Direct execution (legacy):

```bash
npx ts-node ./scripts/run-codex-prompts/run-codex-prompts.ts --harness openai-codex --model gpt-6-astra
```

### Available options:

```bash
--dry-run                     # Print unwritten prompts without executing
--harness <harness-name>        # Select runner: openai-codex, github-copilot, cline, claude-code, opencode, gemini (required for non-dry-run)
--model <model>               # Model override (optional; each harness defaults to its current flagship)
--agent <agent-book-path>     # Book override (optional; run/server/plan default to agents/developer.book)
--path <directory>            # Project directory (default: invocation cwd, not an enclosing Git root)
--context <context-or-file>   # Replace the default project AGENTS.md with inline text or a project-relative file
--check <check-command...>       # Run a verification command after each prompt and feed failures back for retries
--check-before <mode>           # no (default), yes-and-fail, or yes-and-fix; enabled modes default to npm run check
--no-ui                       # Disable the rich terminal UI and stream plain console output instead
--thinking-level <level>      # Reasoning effort for OpenAI Codex and GitHub Copilot: low, medium, high, xhigh
--priority <minimum-priority> # Alias for --min-priority
--min-priority <minimum-priority> # Filter prompts by minimum priority level
--max-priority <maximum-priority> # Filter prompts by maximum priority level
--allow-credits               # Allow OpenAI Codex runner to spend credits when limits are exhausted
--isolate                     # Implement each prompt in its own temporary git worktree and merge it back when verified
--auto-push                  # Push each successful commit to the configured remote
--auto-migrate                # Run testing-server DB migrations after each successful prompt
--allow-destructive-auto-migrate # Override destructive SQL heuristic guard in auto-migrate mode
--no-auto                     # Wait for user confirmation before each prompt instead of running automatically
--wait-after-prompt <duration>    # Wait this long after each prompt finishes before starting the next prompt (default 0)
--wait-between-prompts <duration> # Pace prompts so each next prompt starts at least this long after the previous start (default 0)
--wait-after-error <duration>     # Wait this long before retrying after an error (up to 3 retries, default 10m)
--git-changes <mode>          # Dirty working tree: fail (default), ignore the changes, or continue the interrupted [^] prompt
--no-normalize-line-endings   # Disable per-round CRLF -> LF normalization for changed files
```

Omit `--model` to use the current flagship from the shared harness defaults. `PTBK_MODEL` or an explicit
`--model` overrides that selection. `--model default` keeps the native configuration for Codex, Copilot,
Claude Code and OpenCode; Gemini, Qwen Code and Cline resolve it to their current flagship. Newly initialized
`coder:run` scripts omit `--model` so future Promptbook updates also update their default model.

For `--harness openai-codex`, credits are opt-in. If Codex reports that credits are required and `--allow-credits` is not set, the runner fails fast with a rerun hint.

### Terminal controls

The `S` control is shown only while the coder is waiting; it is hidden while a prompt is running or after the run has finished.

```text
[p] Pause  [s] Skip current waiting  [x] End with this prompt
[o] Show raw output  CTRL+C Exit
```

Press `X` again after requesting the dynamic end to continue the full current run.

Every interactive invocation starts in **Normal output**. It shows the agent's own messages separately from
runner status, commands/tools, reported file changes, verification, results, warnings and failures. Claude Code
message deltas and Codex item snapshots are assembled without repeating their protocol envelopes. Codex's
existing plain stream is also supported; other unstructured or unfamiliar output has an explicit fallback label.
Only activity already reported by the harness or runner is shown. TEAM events carry the teammate's name when available.

Press `O` at any time to switch to **Raw output**. The same control becomes `[o] Show normal output` and switches
back without restarting the harness, acknowledging a prompt or submitting another model call. The selection lasts
through subsequent tasks in this invocation. There is no output-mode flag or saved preference.

Use `↑` / `↓` to scroll the output buffer and `End` to follow live output again. Long lines wrap to the panel width.
On short terminals, `PageUp` / `PageDown` scroll the dashboard while its controls stay visible. Session, current task,
progress, errors and the agent visual remain part of the same dashboard.

Display history is bounded: the raw view keeps up to 256,000 characters / 2,048 original chunks, and Normal output
keeps up to 160 entries with at most 8,000 characters each, retaining command summaries and trailing output.
Oversized or unfinished protocol records are
labeled explicitly; earlier output remains in the existing run trace under `prompts/traces/` (and temporary logs
when `--preserve-logs` is used). Changing views never rewrites logs or traces. `--no-ui` and redirected output retain
plain streaming output; the view toggle and dashboard redraws apply only to the interactive dashboard.

Every press is answered right under the pills, so you never have to guess whether the key arrived:

```text
» S  Skipping the current waiting, continuing right now
» S  Nothing to skip, the coder is not waiting right now (×2)
```

The answer stays on screen for a few seconds and repeated identical answers are counted, so pressing the same control twice redraws the frame too. In `--no-ui` mode the very same line is printed to the console instead.

Whenever `S  Skip current waiting` is offered, the wait really ends on that key press: the `--wait-between-prompts` and `--wait-after-prompt` pacing, the `--wait-after-error` cool-down, the Claude Code session-limit wait before a `--resume` resurrection, and the `ptbk coder server` keep-alive poll.

### Examples:

```bash
# Dry run to preview prompts
ptbk coder run --dry-run

# Run with OpenAI Codex
ptbk coder run --harness openai-codex --model gpt-6-astra

# Run with project instructions loaded from AGENTS.md
ptbk coder run --harness openai-codex --model gpt-6-astra --agent agents/coding/developer.book

# Run with one-off inline instructions
ptbk coder run --harness openai-codex --model gpt-6-astra --context "Focus only on src/cli"

# Run with OpenAI Codex and explicitly allow credit spending
ptbk coder run --harness openai-codex --model gpt-6-astra --allow-credits

# Run with explicit post-commit git pushing
ptbk coder run --harness github-copilot --model gpt-6-astra --thinking-level xhigh --agent agents/coding/developer.book --auto-push

# Run with GitHub Copilot
ptbk coder run --harness github-copilot --model gpt-6-astra --thinking-level xhigh

# Run project checks before coding and let one repair prompt fix pre-existing failures
ptbk coder run --harness github-copilot --model gpt-6-astra --thinking-level xhigh --check-before yes-and-fix

# Run with plain streaming output for logging/debugging
ptbk coder run --harness github-copilot --model gpt-6-astra --thinking-level xhigh --agent agents/coding/developer.book --no-ui

# Run with Gemini
ptbk coder run --harness gemini --model gemini-3.8-flash

# Run with Claude Code
ptbk coder run --harness claude-code

# Run with priority range filter
ptbk coder run --harness openai-codex --model gpt-6-astra --min-priority 1 --max-priority 5

# Run with automatic testing-server migrations after each prompt
ptbk coder run --harness openai-codex --model gpt-6-astra --auto-migrate

# Run each prompt in its own isolated git worktree
ptbk coder run --harness github-copilot --model gpt-6-astra --thinking-level xhigh --agent agents/coding/developer.book --isolate

# Start the next prompt even though the working tree still has uncommitted changes
ptbk coder run --harness claude-code --git-changes ignore

# Continue the one prompt a killed or crashed coder left behind in the [^] status
ptbk coder run --harness claude-code --git-changes continue
```

## Prompt statuses

Every prompt can start with a checklist marker on its first line. A prompt without a status marker is ready at priority `0`; when the coder starts it, the first live status line is added before its content and then rewritten as the task moves along:

| Marker | Meaning                                       |
| ------ | --------------------------------------------- |
| `[-]`  | Not ready to be picked up at all              |
| `[ ]`  | Ready, waiting for the next free coding round |
| `[^]`  | Being implemented right now                   |
| `[x]`  | Implemented, verified and committed           |
| `[!]`  | Failed                                        |

The `[^]` in-progress status is rewritten before every single step of the round, so it always names the harness, the model, the steps which already finished and the step which is running:

```text
[ ]
[^] by OpenAI Codex `gpt-5.6-luna` thinking `max` - Implementation in progress
[^] by OpenAI Codex `gpt-5.6-luna` thinking `max` (ChatGPT account) - Implementation ~$0.2036 10 minutes; Checking in progress
[x] by OpenAI Codex `gpt-5.6-luna` thinking `max` (ChatGPT account) - Implementation ~$0.2036 10 minutes; Checking 35 minutes
```

A run names its selected Book agent (Developer by default) in front of the harness which runs it, because the same harness and model behave differently depending on the agent they run as:

```text
[x] by Developer on OpenAI Codex `gpt-5.6-luna` thinking `max` (ChatGPT account) - Implementation ~$0.2036 10 minutes; Checking 35 minutes
```

Only the final `[x]` state is committed, because the round commit is created after the prompt has been implemented and verified. The `[^]` status is deliberately never reverted: when the coder is killed or crashes, the prompt file keeps `[^]` as the signal that this task was left in the middle of its implementation. Such a prompt is not picked up again automatically — decide yourself whether to reset it to `[ ]`, to keep the partial work, or to resume it with `--git-changes continue`.

## Run traces

Every round writes a run trace into `prompts/traces/`, named exactly like the prompt file it belongs to (`prompts/2026-09-0180-ptbk-coder-save-traces.md` is traced in `prompts/traces/2026-09-0180-ptbk-coder-save-traces.md`, and a prompt file holding more than one section appends the same `-2` suffix its temporary scripts use).

Each trace pairs the metadata of the round with the untouched runtime log of the harness:

-   the prompt it implemented, and which section of it when its file holds more than one,
-   whether the round succeeded or failed,
-   the Book agent, harness, model, thinking level and login method which ran it,
-   how many coding attempts it took, what each step cost and how long each one ran,
-   the verification command, when one is configured,
-   when it started, when it finished and how long it took,
-   the error which ended a failed round,
-   everything the harness and the verification command have written, including the generated shell scripts and the prompt they embed.

The trace is written before the round is committed, so it lands in the very same commit as the prompt it describes. This is the only place where the live runtime log survives — that log is a temporary artifact which is deleted as soon as a successful round is over (unless `--preserve-logs` keeps it). Re-running the same prompt overwrites its trace; the earlier ones stay in the git history.

## Dirty working tree

`--git-changes` decides what happens when the working tree still has uncommitted changes before a prompt starts:

| Mode       | Behavior                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------- |
| `fail`     | Refuses to start and asks for a commit, a stash or one of the other two modes (the default) |
| `ignore`   | Starts the next `[ ]` prompt anyway and leaves the uncommitted changes where they are       |
| `continue` | Resumes the interrupted `[^]` prompt with its half-finished changes still in place          |

`continue` expects **exactly one** prompt in the `[^]` status and fails when it finds none or more than one, because the uncommitted changes could not be attributed to a single interrupted task. Only the resuming round runs on the dirty tree; once it is finished and committed, every later round expects a clean working tree again. It cannot be combined with `--isolate`, whose fresh worktree is checked out from the last commit and would leave the uncommitted changes behind.

The harness which resumes the work does not have to be the one which started it. Its status report is built in
chronological order and remains extendable if another run is interrupted later:

```text
[^] by OpenAI Codex `gpt-5.6-luna` thinking `max`, interrupted, continued by Claude Code `claude-opus-5` thinking `high` - Implementation in progress
[x] by OpenAI Codex `gpt-5.6-luna` thinking `max`, interrupted, continued by Claude Code `claude-opus-5` thinking `high`
```

The status still names the phase currently running, but it does not append a completed continuation's own cost and
duration as though they measured the whole interrupted prompt.

## Isolated runs

With `--isolate`, no prompt is ever implemented in the working tree you started the coder from:

-   Each task gets a temporary git worktree in `.promptbook/coder-isolation-worktrees/<task-name>` on branch `ptbk-coder-isolation/<task-name>` (for example `.promptbook/coder-isolation-worktrees/2026-07-0700-ptbk-coder-timing`).
-   The worktree gets its own copy of the project `.env`, so the isolated task runs with its own environment.
-   The coding agent, the `--check` verification command and the round commit all happen inside the worktree.
-   Once the task is implemented and verified, it is merged back into the branch the coder runs on as one commit and the worktree plus its branch are deleted.
-   If the merge fails, the task is marked as `[!]` instead of `[x]`, the failure is committed into the original worktree, the temporary worktree is kept for a manual merge, and the coder continues with the next task.

Because the worktrees live inside `.promptbook`, `--isolate` requires that folder to be git-ignored (`ptbk coder init` sets this up).

## Agent identity configuration

All commits created by this script are signed with a dedicated agent identity. The helper in `scripts/run-codex-prompts/git/agentGitIdentity.ts` reads the following environment variables, so you can customize the identity per machine:

-   `CODING_AGENT_GIT_NAME` – the `user.name` value that will appear on each commit.
-   `CODING_AGENT_GIT_EMAIL` – the `user.email` value that will appear on each commit.
-   `CODING_AGENT_GPG_KEY_ID` – the GPG key ID used to sign the commit (the key must exist in your local GPG keyring).
-   `CODING_AGENT_GPG_PROGRAM` (optional) – override the GPG program if you do not want to use the default `gpg` binary.

Set the values via `.env`, shell variables, or whichever secrets manager you prefer. The script will fail fast if the identity is missing so that commits cannot fall back to the primary user's configuration.

If you need a fresh agent key, generate it with GPG (for example from a temporary config file: specify `Name-Real`, `Name-Email`, `Key-Type`, `Key-Length`, `%no-protection`, and `%commit`) and set `CODING_AGENT_GPG_KEY_ID` to the new key's long ID.

You can bootstrap your environment with the "Promptbook Coding Agent" details (name `Promptbook Coding Agent`, email `coding-agent@promptbook.studio`, key ID `13406525ED912F938FEA85AB4046C687298B2382`), then swap them out whenever a different persona makes more sense.
