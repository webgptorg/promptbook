# Project initialization

[Main specification](../_main.md)

`ptbk init` (`ptbk initialize`) prepares either an empty folder or an existing project. Plain interactive invocation asks whether to initialize the current folder or create a project/ongoing agenda from a description. Noninteractive invocation must allow the choice and description to be supplied explicitly; it must not wait for an invisible prompt.

Basic initialization prepares Git, `agents/`, `tasks/`, project instructions, required [core agents](../agents/core-agents.md), useful role/task templates and the `.ptbk/` ignore rule. It installs supported harness CLIs globally as part of setup and guides required logins. Existing installations are detected; unavailable installation or login is explained, not reported as success. [Harness setup](harnesses.md) determines readiness.

Initialization is repeatable. Add missing artifacts without overwriting customized agents, instructions, scripts, settings, templates or existing content. Create only missing core agents. Default ordinary roles include Developer, Planner, Lawyer and Copywriter; their initial TEAM instructions can make the relevant advisors available. Preserve existing validation; otherwise prepare an honest setup requirement rather than a check that always succeeds.

## Creating an agenda from intent

Offer a simple text input or planning conversation describing the desired project, such as organizing accounting materials or managing customer communication. First perform basic initialization. Then create an ordinary first task assigned explicitly to [Expert](../agents/expert.md), containing that intent and supplied context, and immediately execute it through the common task lifecycle. Expert adapts the project, agents, checks and initial work to the request. Continue into `ptbk start` so the agenda begins operating.

Expert comes from the running engine and is never materialized in the project. Basic initialization without an agenda request must not unexpectedly run project work. Existing content remains protected in both flows; unresolved setup requirements are shown before unattended execution.

See [Git preflight](git-preflight.md), [execution](execution.md) and [start](start.md).
