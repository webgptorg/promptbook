# Project initialization

[Main specification](../_main.md)

`ptbk init` (`ptbk initialize`) incrementally prepares an empty folder or an existing project. It uses the shared [interactive wizard](interactive-ui.md), with equivalent choices available in advance for noninteractive use. Initialization is one reusable workflow: start invokes the same readiness checks and missing setup steps, not a second implementation of initialization.

## Destination and intent

After the optional [self-update](updates.md) gate, the first project question uses the shared [single-choice picker](interactive-ui.md#predefined-choices) for **Current directory** (default) or **New subfolder**. Enter accepts Current directory; choosing New subfolder opens a separate text field for its name/path. Show the resolved destination before applying changes. Explicitly supplied destinations need not be asked again. Creating a child inside Git follows [nested-project initialization](nested-projects.md); a nonempty destination must not be treated as a fresh folder.

For a fresh empty destination, offer the shared rich text input for project intent. Leaving it empty creates a useful sample/boilerplate project without a model call or starting agenda work. For an existing project, Git setup or Promptbook artifacts, skip the intent question and preserve the project's purpose; add missing Promptbook support rather than regenerate it.

## Incremental setup

Check Git, `ptbk.json`, agent/task locations, project instructions, core agents, templates and runtime ignore rules individually. Reuse a valid enclosing repository and its current branch, including one without a first commit; otherwise initialize Git. Support partially completed setup and resume only missing work.

Prepare `agents/`, `tasks/`, readable project instructions, required [core agents](../agents/core-agents.md), useful role/task templates, [configuration](configuration.md) and the `.ptbk/` ignore rule. Create only missing core agents. Default ordinary roles include Developer, Planner, Lawyer and Copywriter, with useful TEAM relationships. Preserve existing validation; missing validation must be an honest setup requirement, never an always-successful check.

Apply the destination-specific [local installation choice](installation.md). Let the user select one, several or no harnesses using the shared checkbox picker; never assume all are wanted or ask for comma-separated identifiers. Use [harness setup](harnesses.md) and its separate [update choices](harness-updates.md), reusing healthy global installations and authentication. Browser selection is an independent step with the isolated project profile as default. Deferred execution prerequisites remain clearly visible rather than falsely reported as ready.

Resolve a missing or unconfigured project check through the same finite setup step used by interactive start. Offer valid existing validation scripts through a picker, a custom command, or explicit deferral. Show the exact selected command and confirm saving it in `ptbk.json.execution.check` (or repair its existing effective check setting). Validate the command without executing it or calling a model. `init --check COMMAND` supplies this decision in advance when validation is unresolved. Preserve existing valid defaults; a different supplied command remains a temporary override and must appear in the next command. Deferral reports setup incomplete and gives the configuration action, rather than recommending a start that cannot succeed.

Commit authorized setup artifacts, creating the initial commit when none exists or a scoped setup commit on the existing branch. Preserve unrelated files and staged/unstaged changes, hooks and signing. A commit failure is an incomplete setup outcome, not success.

Repeating init with the same version, choices and already-satisfied prerequisites is a no-op: no rewritten files, duplicated templates, reset configuration, repeated login or empty commit. A newer engine may add missing required artifacts as an incremental upgrade, without overwriting customization. Finish with a short changed/already-ready/unresolved summary and the appropriate next command.

## Creating an agenda from intent

For a supplied fresh-project intent, complete basic setup and configure real project validation first. Then create an ordinary first task explicitly assigned to [Expert](../agents/expert.md), containing that intent and context, and execute it through the common lifecycle. Expert adapts the project, agents, checks and initial work. Deferring validation does not create or execute this task. After success, continue into `ptbk start`; unresolved setup blocks unattended execution.

Expert comes from the running engine and is never materialized as a project agent. Blank/default initialization never launches this flow. See [Git preflight](git-preflight.md), [execution](execution.md) and [start](start.md).
