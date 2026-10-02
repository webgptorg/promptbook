import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { PROMPTS_DIRECTORY_PATH } from './boilerplateTemplates';

/**
 * Project-relative location of the offline guide, reserved from prompt discovery.
 *
 * @private internal constant of `coder init`
 */
export const PROMPTS_README_FILE_PATH = join(PROMPTS_DIRECTORY_PATH, 'README.md');

/**
 * Maintained project-independent guide, bundled as text in the published CLI.
 * Keep examples executable against the parser and command registry in the accompanying tests.
 *
 * @private internal template of `coder init`
 */
export const PROMPTS_README_TEMPLATE = spaceTrim(`
    # PRDs and the implementation queue

    This directory holds version-controlled implementation specifications, often called **PRDs** (Product
    Requirements Documents), and a work queue. A PRD describes an intended change: its presence does not mean the
    feature already exists. Read the status, implementation evidence, and current code before relying on it.

    The same Markdown can be implemented by a person or handed to another coding assistant. Promptbook Coder
    automates selection, execution, checks, and status recording; it is not required to understand or use these
    files. The manual workflow below needs only an editor, Git, and this project's normal development tools. No
    Promptbook installation, account, or monorepo checkout is required.

    ## What belongs here

    The default layout, relative to the project root, is:

    \`\`\`text
    prompts/
        README.md                       This guide, excluded from the queue
        YYYY-MM-NNNN-short-title.md      PRDs, including pending tasks and drafts
        done/                           Reviewed, archived task history
        templates/
            common.md                   Reusable authoring instructions
        traces/                         Execution traces, created when tasks run
    \`\`\`

    \`init\` creates the directory, \`done/\`, and \`templates/\`. New default npm scripts also initialize the
    project-owned \`templates/common.md\`. Existing scripts and their custom template choices are preserved. A
    fresh, empty directory receives numbered boilerplates with \`[-]\` and \`@@@\` placeholders; they need authoring
    before use. Repeating init fills missing configuration and creates this README if missing, preserving an
    existing README without appending to it. It does not replenish boilerplates in a nonempty directory.

    Only Markdown files directly in \`prompts/\` enter the queue. \`README.md\` is excluded case-insensitively, even
    if customized or filled with sample statuses. Subdirectories such as \`done/\`, \`templates/\`, and \`traces/\` are
    not scanned for runnable tasks. A file containing the exact comment \`<!--ptbk-coder-ignore-->\` is also
    excluded from queue loading.

    -   **Specifications:** top-level PRDs are the requirements and status of work. Commit them with the project
        so reviewers can connect intent with code.
    -   **Templates:** reusable instructions, not tasks. Adapt \`templates/common.md\` to this repository's
        conventions and actual check commands before copying it into new PRDs.
    -   **History:** \`done/\` holds archived PRDs. An archive records what was reviewed at the time; it does not
        guarantee today's code still has that behavior.
    -   **Diagnostics:** \`traces/\` contains per-task Markdown run traces, with section suffixes for files
        containing multiple tasks. Failures may also leave a neighboring \`.error.log\`; temporary harness logs may
        be retained after failure or with \`--preserve-logs\`. Planning keeps runtime state under the project root's
        \`.promptbook/\`. These artifacts explain what a run did, rather than specify new work. Inspect them before
        sharing and follow the project's retention policy.

    ## Names, titles, and sections

    Coder-generated filenames use \`YYYY-MM-NNNN-short-title.md\`: year/month, a sequence starting at \`0000\` and
    normally increasing by 10, and a descriptive slug. Number allocation also considers numbered Markdown files
    below the directory, including archived PRDs, to avoid reusing their numbers. The number is a naming/order
    convention, not a deadline, dependency, or priority. Handwritten names such as \`fix-search.md\` are valid; no
    date prefix is required.

    Put the status on the **first nonempty line of each task section**, then a blank line, a short title, and the
    requirements. A leading title tag such as \`[✨🔎]\` is a searchable reference used to connect related work and
    code. Generated tasks receive emoji tags; a tag is not a status or a scheduling rule. Headings and the wording
    of titles are conventions, not required syntax. The runner removes the status line and a leading bracketed
    title tag from the task text it sends for implementation.

    One file can contain several independent, multiline task sections. A line whose trimmed content is exactly
    \`---\` starts another section, each with its own status and priority. The parser splits on that line even
    inside a code fence: avoid YAML front matter and decorative \`---\` rules in PRDs. Ordinary headings, lists, and
    acceptance checkboxes inside a section do not create more tasks. Do not put a heading or a comment before the
    section's status: an unmarked first line defaults to pending at priority zero.

    Repository references supply context; they do not automatically include the referenced file's contents. Tell
    the implementer what to inspect and why. Paths written as code, such as \`src/search/filterItems.ts\`, should be
    identified as project-root-relative. Markdown links in a top-level PRD need \`../\` to reach that root, for
    example \`[project instructions](../AGENTS.md)\`. Adapt links when moving files deeper into \`done/\` (often
    \`../../\`), or retain explicit project-root-relative paths in the text.

    ## A small PRD to adapt

    Copy this block into a new file such as \`prompts/YYYY-MM-0010-trim-search-query.md\`, replacing the date/number
    and every example path, command, and assumption with ones that exist in your repository. Read the referenced
    code first. Keep \`[-]\` instead of \`[ ]\` while requirements or acceptance checks remain undecided. The sample
    is illustrative, not a claim that this project contains these files.

    \`\`\`markdown
    [ ] !

    [✨🔎] Ignore outer whitespace in the item search

    ## Goal

    People pasting a query should get the same results as people typing it.

    ## Repository context

    Paths below are relative to the project root:

    -   Read \`src/search/filterItems.ts\` for the current matching behavior.
    -   Extend \`src/search/filterItems.test.ts\` using its existing test style.
    -   Read \`AGENTS.md\` and the root \`README.md\` for development instructions.

    ## Requirements

    -   Trim leading and trailing whitespace from the query before matching.
    -   An empty or whitespace-only query returns all items, as an empty query does today.
    -   Preserve internal spaces, case matching, result order, and the input array.

    ## Scope

    Change the search helper and its tests. Do not change the UI, dependencies, persistence, or unrelated matching
    rules.

    ## Acceptance criteria

    -   Add cases for an empty query, only spaces, and a padded matching query.
    -   Keep an existing case proving that internal spaces retain their meaning.
    -   Run \`npm test -- --runInBand src/search/filterItems.test.ts\` and record the result.
    -   Review the diff for unchanged sorting and no input mutation.
    \`\`\`

    Acceptance criteria should be observable, with commands suitable for your actual test runner and any required
    manual checks. Small bounded tasks are easier to review. Add another section only when it has enough context
    to be implemented independently; section order alone does not enforce dependencies.

    ## Status and scheduling reference

    The following status lines are recognized at the start of a section. The state names describe parser behavior;
    they are not proof that a check passed.

    | Status line                                  | Parsed state | Priority | Meaning                                                                       |
    | -------------------------------------------- | ------------ | -------- | ----------------------------------------------------------------------------- |
    | \`[ ]\`                                        | todo         | 0        | Pending, eligible after authoring and selection filters.                      |
    | \`[ ] !!!\`                                    | todo         | 3        | Pending with higher scheduling priority.                                      |
    | \`[^]\`                                        | in-progress  | 0        | Started, not finished; not selected as a fresh task.                          |
    | \`[x]\`                                        | done         | 0        | Completion recorded; inspect evidence and review before archiving.            |
    | \`[X]\`                                        | done         | 0        | Uppercase X is also accepted.                                                 |
    | \`[!]\`                                        | failed       | 0        | Failed work; inspect the recorded reason before retrying.                     |
    | \`[-]\`                                        | not-ready    | 0        | Draft or deliberately held work, excluded from execution.                     |
    | \`[.]\`                                        | not-ready    | 0        | Alternative spelling of the same draft state.                                 |
    | \`[-] !!\`                                     | not-ready    | 0        | Exclamation marks do not make a draft runnable.                               |
    | \`[.] !\`                                      | not-ready    | 0        | The alternative draft spelling also accepts whitespace and exclamation marks. |
    | \`[^] implementation started\`                 | in-progress  | 0        | Trailing progress information is accepted.                                    |
    | \`[x] by a developer; results below\`          | done         | 0        | Trailing completion information is accepted.                                  |
    | \`[X] reviewed; results below\`                | done         | 0        | Uppercase completion also accepts trailing information.                       |
    | \`[!] acceptance check failed; details below\` | failed       | 0        | Trailing failure information is accepted.                                     |

    Only \`x\` has an accepted letter-case variant. Surrounding whitespace is trimmed. Clean \`[-]\` / \`[.]\` lines
    accept whitespace and \`!\` after the marker; put draft explanations on the following lines. \`[x]\`, \`[X]\`,
    \`[^]\`, and \`[!]\` accept arbitrary trailing metadata. Keep a pending line to whitespace, priority marks, and
    any intended targeting annotations below. Ordinary trailing prose without a backtick target (for example
    \`[ ] implement search\`) makes that recognized status line not-ready, rather than providing a task title.
    Unsupported prefixes such as \`[?]\` are ordinary content and can therefore become pending tasks: **do not use
    \`[?]\` to skip work**.

    Every \`!\` after a valid pending marker contributes one priority point, including marks before or after
    targeting tokens. Higher priorities run first; \`!\` in the task body has no scheduling effect. Equal priorities
    retain filename order from directory loading, then section order. Date numbers and emoji tags do not override
    priority. \`--min-priority\` and \`--max-priority\` set inclusive bounds; \`--priority\` is an alias for the
    minimum, not an exact-priority selector.

    Backtick-delimited tokens on the pending status line target the selected harness, model, or Book agent. For
    example, these are four separate task sections:

    \`\`\`markdown
    [ ] !! use \`gpt\`

    Review search edge cases with a matching model family. Keep the current matching rules and document uncovered
    cases.

    ---

    [ ] use \`openai-codex\` !!!

    Add the agreed search regression tests with this harness. Run the project's focused search checks.

    ---

    [ ] use \`developer\`

    Implement the reviewed search requirement with the Developer Book. Read the repository instructions before
    changing the helper.

    ---

    [ ] use \`agents/developer.book\` or \`claude-code\` !

    Review the search helper's test coverage. Report any missing cases without expanding the feature scope.
    \`\`\`

    Tokens are normalized and matched as substrings of the selected harness name, model name, or the Book's
    path/name/title aliases. Multiple tokens are **alternatives** (any match), not an AND condition; words such as
    \`use\`, \`model\`, and \`or\` are explanatory text. A token does not launch a different runner, switch models, or
    select a Book for you. Omit targets to allow any runner. With no selection flags or runner environment
    settings, \`ptbk coder list\` applies no runner/agent filter; a filtered list can differ from it.

    Status, priority, and targeting affect scheduling and are removed from the implementation prompt. The body,
    referenced context, and selected Book supply implementation instructions. Normal selection chooses pending,
    fully authored, compatible sections. In-progress tasks need deliberate recovery; Coder's
    \`--git-changes continue\` supports resuming a single interrupted task. Review failures before resetting them to
    \`[ ]\`.

    ### Drafts and completion evidence

    The literal placeholder \`@@@\` anywhere in the task text keeps a pending section out of the runnable queue.
    Boilerplates and repair templates use it for missing requirements. Ordinary prose such as “TODO” or “needs
    discussion” is not a skip mechanism. Use \`[-]\` or \`[.]\`, retain placeholders while writing, then review all
    requirements, replace every placeholder, and change the first line to \`[ ]\` only when the task is ready.
    \`ptbk coder find-unwritten\` helps locate pending sections with placeholders; inspect not-ready drafts
    separately.

    Runner-written completion lines may attribute implementation to a harness and model, include
    reasoning/authentication labels, attempts or interrupted/continued history, and report implementation,
    testing, fixing, or total cost/time information. Those are observed run metadata, not instructions, budgets,
    or a frozen list of supported models. A completed status alone does not prove tests ran: direct runs only
    execute an automated verification command when configured. Preserve actual measurements and record unknown
    results or checks that were not run honestly. Manual users must not invent cost/time figures, copy another
    run's attribution, or mark unverified work as verified. The textual metadata rows above demonstrate syntax
    only; use them only when the described events actually happened.

    ## From discussion to a reviewed change

    1. **Discuss and write:** establish the goal, repository context, scope, requirements, and acceptance checks.
       Write a draft directly, use a template, or discuss it with a person or assistant. Keep unresolved tasks
       not-ready.
    2. **Review the PRD:** confirm assumptions against the code, settle open questions, and identify dependencies.
       Leave dependent tasks not-ready until their prerequisites exist; filename or section order is not
       dependency management.
    3. **Make it runnable:** remove placeholders, set \`[ ]\`, and choose a priority or target only when needed.
       Commit/review the specification according to the project's process.
    4. **Select and implement:** inspect the ready queue, read repository instructions and referenced files, mark
       the chosen section \`[^]\`, and implement only its scoped changes.
    5. **Verify and record:** run the acceptance checks and inspect behavior. Record commands, results,
       limitations, and accurate attribution. Mark successful, checked work \`[x]\`; record a failed attempt as
       \`[!]\`, or hold unresolved requirements with \`[-]\` and explain why below it.
    6. **Review and commit:** inspect source, tests, and PRD changes together. Review completed files before
       archiving them into \`done/\`; keep pending or blocked sections in the active directory or move them into a
       separate PRD first. Commit the intended changes under the project's normal review process.

    ### Using Promptbook Coder

    Run commands from the project root. The examples assume \`ptbk\` is already available; see the optional links
    below for installation. Harness execution needs that harness's installation and authentication. Reading,
    editing, and manually implementing PRDs does not.

    Every workspace command checks the enclosing Git working tree, including a parent monorepo, linked
    worktree, or submodule. The selected project directory still owns its Books, prompts and configuration.
    An unborn branch (a repository with no commits) and a local repository with no remote are valid.
    \`ptbk init\` and \`ptbk coder init\` create missing Git metadata automatically, even with
    \`--no-questions\`, and reuse existing Git without changing history, remotes, hooks, configuration or index.
    They never stage pre-existing files or create an initial commit by default.

    Other potentially mutating commands show the resolved target and ask once before \`git init\`; accepting
    resumes the original command. Declining or cancelling stops it before setup, file writes or harness execution.
    With \`--no-questions\` or noninteractive input, a missing repository fails immediately: run
    \`ptbk init --no-questions\`, \`ptbk coder init --no-questions\`, or \`git init\` in the target directory,
    then retry. Disabling commits does not disable this prerequisite. Listing and true \`--dry-run\` previews
    only warn about missing Git and create no setup files. Missing Git itself, bare repositories, corrupt
    metadata, ownership errors and permission failures require repair; they never trigger automatic initialization.
    Remote pull/push options still require your configured remote and identity. Git creation finishes before
    initialization-time synchronization; partial setup failures report completed steps and require review.

    | Command                                                                                   | What it does                                                                                                                                                                                                                                                                                                                                    |
    | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | \`ptbk init\` / \`ptbk coder init\`                                                                         | Initializes missing Git, then creates missing configuration, local Books, this guide, and fresh-directory boilerplates; preserves project-owned content. \`--no-questions\` skips installation questions/checks.                                                                                                                                                                |
    | \`ptbk coder add "Describe the reviewed change"\`                                           | Creates one numbered, tagged pending PRD. Accepts a description argument, stdin, or interactive input; \`--priority\` and \`--template\` are available. It does not discuss or implement the task. Review the generated requirements before running.                                                                                                |
    | \`ptbk coder plan --harness openai-codex\`                                                  | Interactive planning with the local Developer. Review proposals; \`/save\` writes pending PRDs, \`/draft\` writes not-ready drafts, \`/discard\` drops proposals, \`/exit\` ends. It changes PRD Markdown only and never implements or starts the queue. Currently this planning command supports the Codex harness in a compatible interactive terminal. |
    | \`ptbk coder list\`                                                                         | Displays fully authored pending tasks grouped by descending priority without execution or file changes. Optional harness/model/agent and priority filters narrow the list.                                                                                                                                                                      |
    | \`ptbk coder run --harness openai-codex --limit 1 --no-commit --no-auto --test "npm test"\` | Confirms and implements one selected task, then runs the specified project check. Replace the test command as needed. Without \`--limit\`, execution proceeds through the eligible queue; without \`--no-commit\`, run stages and commits its changes.                                                                                              |
    | \`ptbk coder verify\`                                                                       | Human review helper: shows completion claims, offers archival or a repair section, and can also ask about pending tasks. It does not run acceptance tests itself. Archival moves the whole file to \`done/\`, so inspect every section before agreeing. There is no separate archive command.                                                     |
    | \`ptbk coder find-unwritten\`                                                               | Lists pending sections still containing authoring placeholders; not-ready drafts are not included.                                                                                                                                                                                                                                              |
    | \`ptbk coder generate-boilerplates\`                                                        | Adds not-ready starter sections using reusable templates; author and review them before making them pending.                                                                                                                                                                                                                                    |

    For a review-before-commit run, first review and commit or stash existing work: the default run mode refuses a
    dirty working tree. Use the \`--no-commit --no-auto --limit 1\` example, inspect the result, and commit it
    yourself. Here \`--no-auto\` requests interactive confirmation and makes the no-commit mode valid without
    ignoring existing changes. Init/add/plan/verify Git synchronization is opt-in with \`--commit\`; pushing and
    pulling require the corresponding explicit options. Consult \`ptbk coder --help\` and the relevant subcommand's
    \`--help\` for the installed version's full options.

    The initialized \`npm run coder:run\` script supplies \`AGENTS.md\` as context, selects the Codex harness, and
    uses \`npm run test-for-ptbk-coder\` for checks (including pre-run repair mode). The new check script delegates
    to \`npm test\`; configure real tests for your project before running it. Existing npm scripts are preserved, so
    read your \`package.json\` to see your actual commands. Direct \`ptbk coder run\` does not inherit npm-script
    flags.

    ### Book agent, harness, and model

    A **Book agent** is an editable \`.book\` file supplying a role, persona, instructions, identity, and routing
    aliases. A **harness** is the tool that operates on the repository, such as Codex or Claude Code. A **model**
    is the underlying model used by that harness. \`--agent\`, \`--harness\`, and \`--model\` select these
    independently.

    Init creates local Developer and Planner Books in \`agents/developer.book\` and \`agents/planner.book\`, their
    Lawyer and Copywriter TEAM advisers, and shared \`agents/.core/adam.book\` instructions. Books can
    inherit/import instructions; TEAM entries expose advisers for relevant consultations, not an obligation to
    invoke everyone. \`run\`, \`server\` and \`plan\` default to Developer.
    \`--agent ./agents/planner.book\` selects Planner explicitly; another Book path also works. \`list\` has no
    default Book filter. Every Book used in \`plan\`, including Developer, still permits planning only.

    Project commands default to the current directory captured when invoked. \`--path\` selects another existing
    directory, relative to that invocation or absolute; an enclosing Git repository never relocates the project's
    Books, PRDs or context. Additional context defaults to the actual UTF-8 contents of that project's \`AGENTS.md\`.
    A missing implicit file warns and continues; an unreadable file fails. \`--context\` replaces the default with
    inline instructions or a file resolved relative to the selected project; \`--context ""\` disables it.
    Invalid explicit Books and missing/unreadable explicit context files fail without falling back.
    Thus \`ptbk coder run --harness openai-codex\` and
    \`ptbk coder run --harness openai-codex --agent ./agents/developer.book --path . --context ./AGENTS.md\` select
    the same inputs. New npm scripts rely on these defaults; init still creates missing Books and AGENTS.md even
    when every script already exists, preserving existing custom scripts, settings and context.

    Edit local Books to reflect this project's rules; repeat init preserves customizations and adds missing
    defaults/helper references. An invalid explicit Book selection fails rather than silently changing roles.
    Execution uses the current default model for the chosen harness unless \`--model\` or environment configuration
    overrides it; no model version needs to be written into every PRD.

    ## Working manually or with another assistant

    1. Choose one top-level PRD section that is pending, has no \`@@@\`, and has no unresolved prerequisites.
       Respect any deliberate targeting constraints or discuss changing them. Treat this README, templates,
       history, and traces as context, never as queued tasks.
    2. Read the whole selected section, the root \`README.md\`, \`AGENTS.md\` if present, and each relevant
       source/test file. Confirm the request still makes sense. If requirements are incomplete, set \`[-]\` and
       record the missing decisions instead of guessing.
    3. Hand that section and its repository context to your preferred assistant, or implement it yourself. Ask for
       only the stated scope, actual acceptance checks, and an honest result report. Mark the task \`[^]\` so
       collaborators can see it is being worked on.
    4. Implement, run the project's required tests and the PRD's specific acceptance checks, and inspect any
       required UI or behavioral results. Record what ran and what passed or failed in a result paragraph inside
       the same section. Do not insert a \`---\` before that paragraph: it would create another task.
    5. Use \`[x]\` after the scoped work and checks succeed. Use \`[!]\` for an unsuccessful attempt, or \`[-]\` for a
       task waiting on decisions; keep the explanation in the body. If stopping mid-implementation, retain \`[^]\`
       and describe remaining work. Leave unavailable checks explicitly unverified and do not claim verified
       completion.
    6. Run \`git status\` and \`git diff\` from the root. Review the implementation, tests, status, and evidence;
       inspect untracked files too. Archive only fully reviewed files with no work that should remain active,
       adjust relative links as needed, and stage the specific intended paths. Inspect \`git diff --cached\` before
       committing. Follow the repository's normal pull-request/review process.

    These steps work offline with ordinary repository tools; no Promptbook-specific state needs to be
    reconstructed to understand the task.

    ## Optional further reading

    -   [Promptbook Coder website](https://coder.ptbk.io)
    -   [Promptbook repository](https://github.com/webgptorg/promptbook)
    -   [Coder workflow and command documentation](https://github.com/webgptorg/promptbook/blob/main/scripts/run-codex-prompts/README.md)
    -   [Planning workflow documentation](https://github.com/webgptorg/promptbook/blob/main/src/cli/cli-commands/coder/planning/README.md)

    The links add background; the requirements, annotations, and manual workflow needed to use this directory are
    explained above.
`);

// Note: [🟡] Coder documentation must never be published outside of `@promptbook/cli`.
// Note: [💞] Ignore a discrepancy between file name and entity name.
