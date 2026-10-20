# Project initialization

[Main specification](../_main.md) · [Initialization experience](initialization-ui.md)

`ptbk init` (`ptbk initialize`) is a finite technical setup workflow for an empty or existing folder. It prepares support, preserves original intent, saves one ordinary Expert bootstrap and starts the agenda in the background. Project-specific content is created by that task, not a second execution mechanism inside init. Presentation/progress/celebration belong to [initialization UX](initialization-ui.md).

Reuse the same readiness/setup operations from start for genuinely missing initialization, with one handoff and no recursive init/start or duplicate workers. Equivalent decisions can be supplied noninteractively. Later missing/disabled tools in an initialized project are a live resource wait, not permission to rerun the wizard or repopulate deliberately removed resources.

## Initial input and destination

For new initialization, first ask what the user is working on, before destination/installation questions. Accept arbitrary intent, not just software: free text, long pasted material, images and files. Reuse supplied input, resumed drafts or an existing initialization's recorded intent. Reinit/upgrades preserve purpose rather than requesting a new brief.

Then resolve current directory or a new subfolder, reusing an explicit destination, and confirm location before writes. Nonempty content is an existing project, not permission to regenerate it. Children inside Git follow [nested-project initialization](nested-projects.md). The optional [engine-update gate](updates.md) must not displace or lose the original intent/draft; an existing newer-version configuration also follows the [compatibility gate](configuration-migrations.md).

Save accepted input in the initialized project's `specs/_initial.md`, preserving text verbatim: language, wording, whitespace, line breaks and long pasted blocks. Do not summarize, translate or improve it. Save original attachments as project-local assets with ordered working relative links at their corresponding positions. Composer tokens are presentation, not saved replacements for full content. Never retain clipboard/temp-file/absolute-machine references.

These are the initialized project's specifications, not changes to the engine's own specification folder. Prepare them with the [first task](first-task.md). Resume/reinit never overwrites original intent or duplicates attachments. Blank input remains blank; its ordinary Expert task performs a bounded readiness review without inventing purpose.

## Incremental technical setup

Check Git, configuration, source locations, instructions, core agents, templates and ignore rules individually; resume only missing setup. Reuse a valid existing repository/current branch, including an unborn one. When creating a new repository, explicitly initialize **main**. Preserve files, staging, history and customization.

Prepare `agents/`, the configured task source (normally `tasks/`), `chats/`, `specs/`, root-level `traces/`, readable instructions, required [core agents](../agents/core-agents.md) and useful role/task templates. Ordinary defaults include Developer, Planner, Lawyer and Copywriter with useful TEAM relationships. Create only missing cores. Initialize Fixer with the simple general problem-solving Book and User/Expert TEAM under [automatic repair](../concepts/automatic-repair.md), never reset its customized/learned policy.

Create a missing `agents/.core/chatter.book` with `AGENT Chatter` and TEAM access to all other initialized/selected core/specialist roles plus Expert, excluding itself. Build its initial team from the completed role set, not just earlier-created files. Reinit preserves an existing Chatter/team and all other Books. This is technical setup, not an extra chat, model call or bootstrap execution.

Apply destination-specific [local installation choice](installation.md), preserving existing dependencies. Configure selected harness variants through the existing featured/More flow, with global installations, native login and [update choices](harness-updates.md). Complete and verify all initially selected integrations without paid readiness probes; cancellation/deferred selection remains incomplete unless explicitly removed. Reuse valid Codex ChatGPT authentication without requiring an API key or absent credit-control flag; see [harness account rules](harnesses.md).

Configure one browser through the existing four-source picker, defaulting to the dedicated reusable global Promptbook profile, not personal Chrome. Save typed named records in `tools` by calling the **same domain operations** as later CLI/dashboard management. Generate simple names and defaults. Do not ask users to build multiple-account pools, several browser instances or fallback chains during normal init. These remain available afterwards. Resolve known execution permissions during attended setup rather than leave invisible prompts in the daemon.

Write the actual running engine version into a new `promptbookVersion`. Existing older configurations use the ordinary migration pass, with its separate committed provenance, not an ad hoc initializer conversion. Preserve `.ptbk/`, browser/session stores and `.env` as ignored; [environment edits](environment.md) are non-destructive and timestamped.

Collect/reuse the three Traces choices: `traces.isCommitted`, `traces.isVideoIgnored` and `traces.isVideoRecordingEnabled`. Their defaults, dependencies and effective ignore rules live in [trace configuration](trace-configuration.md). Trace directories use literal task source basenames, independently of logical names.

## No check-command question

Remove the check-command question completely from the wizard, including script selection, custom-command prompts and a mandatory validation-deferral decision. Preserve an existing real `execution.check`. When no check is configured, create a successful informational placeholder such as `echo "Configure project checks in ptbk.json execution.check"` without asking the user. It explicitly means real automated validation is not configured, not that project tests passed, and does not block init/start or the first task.

An explicitly supplied `init --check COMMAND` can fill the missing setting without a question; preserve existing valid defaults and the usual temporary-override rules. Never replace a failing real validator with the placeholder to claim success. Expert may establish appropriate validation through ordinary work; see [checks](checks.md). Init itself does not run project checks or call a model.

## Optional synchronization and persistence

Add the **Automatic synchronization** step under [synchronization setup](synchronization-setup.md). Default/reused false asks nothing further. A new yes offers GitHub publication, private by default with explicit public choice, or a user-supplied other origin. Dedicated GitLab setup is future scope. Keep actual origin/upstream in Git, not duplicated JSON fields. Existing repositories/branches/remotes are not silently replaced.

Save the ordinary first task assigned to Expert and referring to `specs/_initial.md`; do not ask for a separate starter assignment. By default commit only authorized local setup before dispatch/publication, using an initial or scoped `PTBK: ` commit and applicable names. Preserve unrelated edits, hooks and signing. Failed local persistence is incomplete setup. Initial remote creation/push has an honest separate outcome: its failure leaves synchronization pending but does not prevent otherwise ready local work.

## Completion and automatic start

Successful local technical setup leaves selected initial tools usable, required roles/storage present, original intent/assets and the ordinary bootstrap saved, and either preserved real validation or the explicitly labelled placeholder. Default setup is committed. Check the settings the service will actually use, not wizard-only state. Do not claim checks or publication succeeded merely because files or login windows were created.

Automatically perform the ordinary [background start](start.md) with the selected project and applicable explicit overrides. No extra Start confirmation, manual Run action or dashboard is required. The daemon executes Expert and follow-ups through the normal queue; init does not execute them inline or wait for their checks/results.

Confirm the bounded service-start outcome and return the terminal. Do not attach/open a dashboard. The primary next hint is `ptbk dashboard`; `ptbk stop` remains available. Distinguish local setup, service launch, task progress and pending synchronization. Launch failure preserves setup/queued work and gives the repair action; a later task failure is runtime work, not a reason to rerun init.

Explicit `init --no-commit` remains a labelled uncommitted setup/task workflow when no required migration or autosync conflicts with it; propagate that policy through the automatic start. Never claim a committed guarantee or silently switch policy. Later committed use follows [Git reconciliation](git-persistence.md).

Cancellation or unresolved essential local setup preserves progress without false success or hidden noninteractive prompts. A placeholder check is not unresolved essential setup, and a remote synchronization outage is not a local-launch prerequisite. Repeating unchanged init creates no empty commits, duplicate/reopened starter, repeated login or reset settings. Reuse a running service without overriding deliberate pause/draining intent; an explicit successful init on a stopped project includes the ordinary start. See [process modes](process-modes.md), [Git preflight](git-preflight.md) and [execution](execution.md).
