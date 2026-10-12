# Promptbook self-update

[Main specification](../_main.md)

Self-update targets the Promptbook installation that is actually running, independently of the destination project and of [harness updates](harness-updates.md). Identify its current version and local/global installation scope accurately.

At the beginning of interactive init, check for a newer applicable released engine version. When one is available, the first question offers to update, with **Yes** as the default, showing current/target versions and the installation affected. No continues initialization with the running version.

Yes updates that same installation: the originating project's dependency for a local invocation, or the active global installation for a global invocation. Preserve whether an existing local dependency is regular or development-only. Do not update some other project's copy or all installations on the machine.

After a successful update, stop this invocation before target-project initialization. Report the installed version and ask the user to run the command again. Do not continue the wizard using the already-loaded old engine or claim that it changed in place. An update failure is explained with a retry/continue-on-current choice in interactive mode; noninteractive failure is explicit.

Noninteractive init never asks this question or silently accepts its interactive default. Its update/skip decision can be supplied in advance; absent explicit self-update authorization, it continues with the running version. A requested successful update still ends with a rerun instruction.

Checking is bounded and best-effort: offline or unavailable release information does not prevent ordinary initialization and is not reported as up-to-date. Unsupported installation/update methods are diagnosed without modifying a different installation. Read-only commands never perform these checks. An already running agenda does not silently replace its engine mid-task.

See [installation](installation.md), [initialization](initialization.md) and [version display](help.md).
