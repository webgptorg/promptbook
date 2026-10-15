# Promptbook self-update

[Main specification](../_main.md)

Self-update targets the Promptbook installation that is actually running, independently of the destination project and of [harness updates](harness-updates.md). Identify its current version and local/global installation scope accurately.

Early in interactive init, check for a newer applicable released engine version. A new project's intent composer remains the first question under [initialization](initialization.md); update selection is an early technical step, not a replacement for that opening. When an update is available, offer it with **Yes** as the default, showing current/target versions and the installation affected. No continues with the running version.

Yes updates that same installation: the originating project's dependency for a local invocation, or the active global installation for a global invocation. Preserve whether an existing local dependency is regular or development-only. Do not update some other project's copy or all installations on the machine.

After a successful update, stop this invocation before applying target-project setup. Report the installed version and ask the user to rerun. Preserve accepted intent and attachments as a recoverable setup draft for that rerun; do not make the user paste them again, publish them as project output prematurely or retain temporary copies beyond their purpose. Do not continue with the already-loaded old engine or claim that it changed in place. An update failure offers retry or continue-on-current in interactive mode; noninteractive failure is explicit.

Noninteractive init never asks this question or silently accepts its interactive default. Its update/skip decision can be supplied in advance; absent explicit self-update authorization, it continues with the running version. A requested successful update still ends with a rerun instruction.

Checking is bounded and best-effort: offline or unavailable release information does not prevent ordinary initialization and is not reported as up-to-date. Unsupported installation/update methods are diagnosed without modifying a different installation. Read-only commands never perform these checks. An already running agenda does not silently replace its engine mid-task.

See [installation](installation.md), [initialization experience](initialization-ui.md) and [version display](help.md).
