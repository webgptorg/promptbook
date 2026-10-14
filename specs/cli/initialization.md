# Project initialization

[Main specification](../_main.md)

`ptbk init` (`ptbk initialize`) incrementally prepares an empty folder or an existing project. It uses the shared [interactive wizard](interactive-ui.md), with equivalent choices available in advance for noninteractive use. Initialization is one reusable workflow: start invokes the same readiness checks and missing setup steps, not a second implementation of initialization.

## Destination and intent

After the optional [self-update](updates.md) gate, the first project question uses the shared [single-choice picker](interactive-ui.md#predefined-choices) for **Current directory** (default) or **New subfolder**. Enter accepts Current directory; choosing New subfolder opens a separate text field for its name/path. Show the resolved destination before applying changes. Explicitly supplied destinations need not be asked again. Creating a child inside Git follows [nested-project initialization](nested-projects.md); a nonempty destination must not be treated as a fresh folder.

For a fresh empty destination, offer the shared rich text input for project intent. Leaving it empty creates a useful sample project, including real validation and a [first runnable task](first-task.md), without a model call or starting agenda work. For an existing project, Git setup or Promptbook artifacts, skip the intent question and preserve the project's purpose; add missing Promptbook support rather than regenerate it.

## Incremental setup

Check Git, `ptbk.json`, agent/task locations, project instructions, core agents, templates and runtime ignore rules individually. Reuse a valid enclosing repository and its current branch, including one without a first commit; otherwise initialize Git. Support partially completed setup and resume only missing work.

Prepare `agents/`, `tasks/`, readable project instructions, required [core agents](../agents/core-agents.md), useful role/task templates, [configuration](configuration.md) and the `.ptbk/` ignore rule. Create only missing core agents. Default ordinary roles include Developer, Planner, Lawyer and Copywriter, with useful TEAM relationships. Preserve existing validation; missing validation must be an honest setup requirement, never an always-successful check.

Apply the destination-specific [local installation choice](installation.md). Let the user select one, several or no harnesses using the shared checkbox picker; never assume all are wanted or ask for comma-separated identifiers. Complete [setup](harnesses.md) and the separate [update choices](harness-updates.md) for every selected harness before reporting ready. Reuse healthy global installations and authentication. Browser selection is independent, with the isolated project profile as default. Choosing no usable harness leaves setup incomplete, not ready to run.

Resolve a missing or unconfigured project check during init, not on the next start. Offer valid existing validation scripts through a picker, a custom command, or explicit deferral. Show the exact command and confirm saving it in `ptbk.json.execution.check` or repairing its existing effective setting. Verify command references and required dependencies without executing project checks or calling a model. A fresh sample includes meaningful working validation, not a generated failing placeholder or an unconditional pass. `init --check COMMAND` supplies a missing check decision in advance. Preserve existing valid defaults; a different supplied command remains a temporary override under [configuration precedence](configuration.md).

Create the first runnable task according to [first-task initialization](first-task.md). Commit authorized setup artifacts, creating the initial commit when none exists or a scoped setup commit on the existing branch. Preserve unrelated files and staged/unstaged changes, hooks and signing. A commit failure is an incomplete setup outcome, not success.

## Completion means ready to start

Successful initialization means plain `ptbk start` in this project can begin work without another setup wizard, harness installation/login, check selection or manual task creation. Every selected harness must be usable, the saved project check must be real and configured with its prerequisites available, required agents and work must exist, and authorized setup must be committed. Do not mistake created files, a launched login flow or one healthy harness among several selected ones for completion. Resolve setup requests inside the wizard rather than leaving them for the runtime dashboard.

Check readiness using the saved settings that a new start will use, not only temporary flags or wizard memory. Do not claim project tests passed when init did not run them. Later credential expiry, provider outages, changed project files and genuinely task-specific decisions remain possible runtime problems; they are not excuses to defer known setup.

Reuse a working native Codex ChatGPT login under the [account and billing rules](harnesses.md#codex-account-login-and-billing). Missing optional credit-control flags alone must not mark this selected harness incomplete or prescribe `--allow-credits` as a setup requirement. Report actual missing authentication or required execution capabilities separately from provider quota/billing limits.

Cancellation, deferral or an unresolved prerequisite preserves completed progress but ends with an explicit incomplete/not-ready outcome and the concrete resume action. It must not report successful initialization or recommend an immediately usable start. Noninteractive init fails actionably when required decisions are absent; it never leaves invisible prompts.

Repeating init with the same version, choices and satisfied prerequisites is a no-op: no rewritten files, duplicated first task/templates, reset configuration, repeated login or empty commit. A newer engine may add missing required artifacts without overwriting customization. Finish with a short changed/already-ready/unresolved summary; show `ptbk start` as the ordinary next command only when ready.

## Creating an agenda from intent

For a supplied fresh-project intent, complete setup, all selected harnesses and real project validation first. Then create the ordinary first task explicitly assigned to [Expert](../agents/expert.md), containing that intent and context, and execute it through the common lifecycle. Expert adapts the project, agents, checks and initial work. This task fulfills the first-task contract rather than creating a duplicate starter task. Deferred setup does not create or execute the intent task. After success, continue into `ptbk start`.

Expert comes from the running engine and is never materialized as a project agent. Blank/default initialization never launches this flow. See [Git preflight](git-preflight.md), [execution](execution.md) and [start](start.md).
