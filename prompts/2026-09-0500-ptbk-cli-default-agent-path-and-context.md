[!] failed after an hour by Promptbook Developer on OpenAI Codex `gpt-6-astra`

[✨🎛️] Give project-oriented CLI commands shared defaults: the Developer Book, the current directory, and AGENTS.md, while preserving explicit overrides.

```bash
ptbk coder run --harness openai-codex

# The same project, Book, and additional context selected explicitly:
ptbk coder run --harness openai-codex --agent ./agents/developer.book --path . --context ./AGENTS.md
```

-   This task concerns the CLI and its shared project-resolution services. Do not redesign the Agent Server web application, Book language, or harness/model selection.
-   Users must not have to repeat `--agent`, `--path`, and `--context` in every invocation or package script. The defaults are Developer, the invocation's current working directory, and that project's `AGENTS.md`, respectively.
-   These are three distinct defaults. Do not substitute a test/check command for the requested project-path default. Check terminology and repair-only execution are specified separately.

## Shared defaults and explicit overrides

-   Inventory the registered project-oriented commands and document which options select a primary agent, a project directory, additional context, or merely a listing filter. Apply the defaults consistently wherever the corresponding execution/authoring concept is supported.
-   When a command needs one primary Book agent and `--agent` is omitted, resolve the project's `agents/developer.book` using the existing local Book resolver. Developer is a Book persona, not a harness or model name.
-   This intentionally supersedes the earlier Planner-default policy for single-agent CLI authoring/planning commands, including `coder plan` and the agent-assisted path of `coder add`. A user can still explicitly select `--agent ./agents/planner.book`. Preserve the Planner Book, its initialization, and its availability.
-   Changing a planning persona must not change the command's capabilities: planning and agent-assisted PRD authoring remain planning/authoring only, with their existing tool and write restrictions. Developer must not acquire implementation permissions inside `coder plan`.
-   An explicit `--agent` remains authoritative and keeps the existing supported Book reference forms. An invalid explicit reference must fail clearly rather than silently falling back to Developer. Keep existing missing-default-Book guidance and non-destructive initialization rules; do not fabricate an unrelated generic agent.
-   An omitted `--path` means the current directory captured for that invocation, not the CLI installation directory, a cached directory from an earlier call, or an automatically selected enclosing Git root. An explicit relative path is resolved against the invocation directory; an absolute path selects that directory directly.
-   At the inspected baseline, `coder run` uses `process.cwd()` and does not register a project `--path` option. Add the shared optional project-path option where needed rather than documenting a flag that does not work.
-   Validate explicit project paths before side effects. Report missing, non-directory, or inaccessible targets clearly. Do not create directories implicitly outside an initialization operation that explicitly supports doing so.
-   When `--context` is omitted, load `AGENTS.md` from the resolved project directory as additional context. Use its actual UTF-8 contents, not the literal filename as an instruction, and do not invent an `agent.md` or `agent-and-me` convention.
-   An explicit `--context` replaces this implicit additional-context selection and retains the existing inline-text-or-file behavior. Resolve relative context files against the selected project, not the caller's unrelated directory. Do not append the implicit AGENTS.md a second time after resolving an explicit override.
-   If the implicit AGENTS.md does not exist, continue with a concise diagnostic and no additional context; do not create it, ask a question, or pass its filename as prose. An unreadable existing default file or an explicitly requested missing/unreadable context file must produce an actionable error. Preserve the existing intentional empty-context behavior, and test it rather than interpreting every falsey value as omission.
-   Do not add unrelated precedence layers or new environment variables. Preserve explicit project configuration already supported by a command and make the precedence between it, explicit flags, and these fallbacks unambiguous. Defaults must not override explicit user configuration.

## Preserve command-specific scope

-   Do not require an agent or load agent context for help, version, initialization, pure listings, or utilities which do not invoke a Book agent. A `--agent` listing filter is not primary-agent selection: preserve the ability to list tasks for all agents when no filter is supplied.
-   Do not turn required operands for operations on a specific agent/file into implicit permission to modify Developer. Only the described optional execution defaults are changing.
-   Keep explicit task-level agent/harness targeting and existing TEAM behavior intact. Supplying a default persona does not authorize running a task targeted at another agent.
-   Coordinate with [the unified workspace server](2026-09-0490-ptbk-server-unified-workspace-agent-server.md): its CLI uses the same project/context resolution and Developer for untargeted implementation work, but still discovers all agents and schedules multiple agents. Do not replace that server contract with a single-Developer filter.
-   Apply the shared defaults to [the forthcoming repair-only command](2026-09-0520-ptbk-coder-fix-checks-only.md) when it is added. Do not implement that command in this task.

## One resolved project context

-   Introduce or extend one shared option-registration/normalization and project-context resolution path. Reuse the existing Book and inline/file context resolvers; do not copy default strings and path logic into every command handler.
-   Capture the invocation directory at action time and pass explicit resolved project paths downstream. Audit prompt discovery, templates, Book inheritance/TEAM, context, checks, subprocess cwd, temporary artifacts, traces, and Git operations so every stage refers to the same selected project.
-   In particular, remove the assumption that a module-level `PROMPTS_DIR = join(process.cwd(), 'prompts')` selects the right project for every invocation. Test two projects sequentially within one Node process and paths containing spaces.
-   Distinguish the selected project directory from its enclosing Git repository. Reuse [the shared Git preflight](2026-09-0480-ptbk-coder-git-repository-preflight.md); finding a parent repository must not relocate AGENTS.md, Books, or PRDs out of a nested project.
-   Avoid process-global cwd/environment mutations as the mechanism for sharing project state. Where an existing subprocess needs cwd, pass it explicitly. Preserve isolated-worktree execution by mapping project-relative paths to the appropriate worktree rather than accidentally reading or writing the original checkout.
-   CLI aliases must reach the same normalization policy. Integrate top-level `ptbk init` and `ptbk server` as their prerequisite PRDs land, without implementing another initializer or another server here.
-   Preserve `--no-questions`, read-only previews, Git safety, existing commit/pull/push defaults, and finite-versus-server execution semantics. This defaults change must not install a harness, make a paid model call, or mutate files merely to display help or resolve optional context.

## Initialization, scripts, and documentation

-   Simplify newly generated package scripts to rely on these defaults instead of redundantly spelling out Developer, `--path .`, and `--context AGENTS.md`. Preserve explicit non-default overrides and unrelated flags such as harness selection.
-   Keep generation of the default Books and AGENTS.md independent of whether their paths still appear as arguments in a package script. Removing a redundant argument must not prevent initialization from creating an essential artifact; inspect referenced-artifact discovery rather than only editing script strings.
-   Repeated initialization must preserve project-owned Books, AGENTS.md, customized scripts, and settings. Do not rewrite every existing script just because a shorter spelling is now possible.
-   Update command help and examples to describe actual defaults and overrides. Remove misleading claims that Planner is the implicit primary agent where this task changes that behavior, while continuing to document explicit Planner selection and planning-only permissions.
-   Coordinate generated scripts and examples with [check terminology](2026-09-0510-ptbk-coder-check-terminology.md); do not independently implement that rename here.

## Acceptance criteria

-   In an initialized fixture, omission of all three flags resolves the same project, Developer Book, and additional context as explicitly supplying their default values. Agent/context contents observed by a deterministic mock harness match.
-   Explicit agent, project, and inline/file context overrides work independently and in combination. A project selected from another directory never reads that caller directory's AGENTS.md or agents, discovers its prompts, or commits its files by mistake.
-   Tests cover a missing implicit AGENTS.md, an empty file, unreadable files, invalid explicit references, nested projects, relative/absolute paths, spaces, platform path separators, repeated invocations, and isolated worktrees.
-   Agent-assisted planning/authoring defaults to Developer without permitting implementation writes; explicit Planner remains usable. Unfiltered listings and multi-agent server discovery do not become Developer-only.
-   Fresh and repeated initialization still produce/preserve the expected AGENTS.md and Books after redundant script arguments are removed. Custom scripts and explicit overrides remain intact.
-   Help, version, and dry-run cases remain free of setup writes and paid calls. Git checks apply to the selected project and preserve the prerequisite's interactive/noninteractive policy.
-   Test the installed CLI in an external fixture so defaults do not accidentally depend on this monorepo. Use temporary projects and mock harnesses; no live model calls are required.

## Context and related work

-   Inspect [CLI registration](../src/cli/$initializePromptbookCliProgram.ts), [Coder registration](../src/cli/cli-commands/coder.ts), [run](../src/cli/cli-commands/coder/run.ts), [plan](../src/cli/cli-commands/coder/plan.ts), and [agent options](../src/cli/cli-commands/coder/agentCliOptions.ts).
-   Reuse [Book resolution](../scripts/run-codex-prompts/common/resolveCoderAgent.ts), [context resolution](../scripts/run-codex-prompts/common/resolveCoderContext.ts), and the actual project propagation in [the runner](../scripts/run-codex-prompts/main/runCodexPrompts.ts) and [single-round execution](../scripts/run-codex-prompts/main/runPromptRound.ts).
-   Inspect [generated scripts](../src/cli/cli-commands/coder/getDefaultCoderPackageJsonScripts.ts) and [project initialization](../src/cli/cli-commands/coder/initializeCoderProjectConfiguration.ts). Reconcile the intentionally changed persona defaults with [the earlier default-agent PRD](2026-09-0420-ptbk-coder-default-agents.md), without deleting its other requirements.
-   Keep in mind the DRY _(don't repeat yourself)_ principle. Update the CLI reference, generated workflow README, and relevant [Coder documentation](../apps/coder-landing), not the Agent Server application UI.
-   Add the implemented changes into the [changelog](../changelog/_current-preversion.md).

