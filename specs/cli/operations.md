# Operational quality

[Main specification](../_main.md)

The packaged CLI must work over external user projects on Linux, macOS and Windows, with global and local installation, paths containing spaces, and headless or desktop operation. Its operation must not depend on source paths in its own development repository.

Parsing, help, list, dry-run and task conversion work offline without paid model calls. Waiting for known times or provider availability is efficient and bounded. Goal enquiry is a deliberate scheduled task, not continuous idle polling.

Long-running operation must bound logs, memory, subprocess lifetimes and retry costs while preserving necessary recovery evidence. Handle clock changes, low disk space, lost network, failed checks and process interruption without false success or deletion of user work. Keep the daemon inspectable when useful work is blocked.

Errors state the project/task, failed activity, preserved work and next action. Noninteractive commands never wait on invisible terminal input; daemon questions use the visible request queue. Stop only owned processes. User-selected shell checks have explicit shell semantics, while task text, paths and model output must not become unintended shell commands.

Completion requires verified task behavior, safe Git persistence and accurate status across interfaces, not only passing a build. [Acceptance scenarios](acceptance.md) define representative outcomes; they are requirements, not claims that tests have already passed.
