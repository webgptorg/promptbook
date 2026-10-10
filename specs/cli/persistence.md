# Persistence across system restarts

[Main specification](../_main.md)

Daemon mode is persistent by default. After one successful `ptbk start`, closing the terminal, an unexpected process exit or an operating-system restart must not permanently stop the agenda. It resumes over the same project, with the same selected installation and effective configuration, without requiring the user to launch the CLI again.

`--no-persist` disables automatic restart/startup registration without changing the durability of project files, browser sessions, questions or recovery records. Foreground modes remain foreground; they do not implicitly install a replacement daemon.

Support this experience on Linux, macOS and Windows, for both global and project-local installations and on desktop and headless hosts. State any operating-system permission or account-session prerequisite accurately. If persistence cannot be established, report that startup is not persistent and give a concrete resolution; never claim a guarantee that was not installed.

Restart registration is scoped to the correct project and user and does not duplicate on repeated starts. Deliberately stopped projects stay stopped. Missing project paths, unavailable installations and expired authentication become visible recoverable conditions, not execution against another directory or identity.

Recovery must reconcile previous work before continuing; restarting is not permission to repeat completed work or external actions. See [process modes](process-modes.md) and [recovery](recovery.md).
