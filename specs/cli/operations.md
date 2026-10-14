# Operational quality

[Main specification](../_main.md)

The packaged CLI works over external user projects on Linux, macOS and Windows, with global/local installation, paths containing spaces and headless/desktop operation. It must not depend on source paths in its own development repository.

Parsing, help, about, version, list, dry-run and task conversion work offline without paid model calls. Read-only commands do not check for or perform updates. Initialization's release checks are bounded and do not falsely treat network failure as proof of currency. Waiting for known times/provider availability is efficient and bounded. Goal enquiry is deliberate work, not continuous idle polling.

Long-running operation bounds logs, memory, subprocess lifetimes, maintenance checks and retry costs while preserving required recovery evidence. Handle clock changes, low disk, network loss, failed checks and interruption without false success or deleting user work. Keep the daemon inspectable when useful work is blocked.

Use the shared [error contract](errors.md) and [interactive/noninteractive UI](interactive-ui.md), including for initialization and startup failures. Noninteractive commands never wait on invisible terminal input; daemon questions use the visible request queue. Stop only owned processes. User-selected shell checks have explicit shell semantics, while task text, paths and model output must not become unintended shell commands.

Completion requires verified task behavior, safe Git persistence and accurate cross-interface status, not only passing a build. [Acceptance scenarios](acceptance.md) are representative requirements, not claims that tests have already passed.

Repository changes and releases satisfy the [GitHub Actions check and publication contract](releasing.md): required hosted checks pass on every supported platform/runtime, and authorized releases complete validated publication and public installation verification.
