# Persistence across system restarts

[Main specification](../_main.md)

Daemon mode is persistent by default. After successful `ptbk start`, closing the terminal, an unexpected process exit or an operating-system restart must not permanently stop the agenda. It resumes over the same project, selected installation and effective configuration without requiring another manual launch.

Recovery preserves the existing process's invocation overrides without writing them into `ptbk.json`; a new independent invocation follows [configuration precedence](configuration.md). Report the version actually loaded after a restart. Recovery must not implicitly switch from a project-local installation to a global copy or perform an unapproved engine self-update.

`--no-persist` disables automatic restart/startup registration without changing the durability of project files, browser sessions, questions or recovery records. Foreground modes stay foreground and do not implicitly install a replacement daemon.

Support Linux, macOS and Windows, global/project-local installations and desktop/headless hosts. State operating-system permission or account-session prerequisites accurately. If persistence cannot be established, report that startup is not persistent and give a concrete resolution; never claim a guarantee that was not installed.

Registration is scoped to the correct project/user and does not duplicate on repeated starts. Deliberately stopped projects stay stopped. Missing paths, unavailable installations and expired authentication become visible recoverable conditions, not execution against another directory or identity.

Reconcile previous work before continuing; restart is not permission to repeat completed work or external actions. See [process modes](process-modes.md), [updates](updates.md) and [recovery](recovery.md).
