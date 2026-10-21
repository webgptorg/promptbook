# Self-naming terminal titles

Promptbook CLI sessions should identify themselves in the host terminal's title/tab label, without requiring VS Code settings, extensions, or terminal-specific integration.

- When running interactively in a compatible terminal, Promptbook emits an OSC title-control sequence (OSC 0 or OSC 2) to set a concise, human-readable session title. Include a recognizable Unicode symbol and `Promptbook`, followed by useful context such as project name and current mode/task; avoid redundant paths and overly long titles.
- Update the title when meaningful context changes (for example initialization, dashboard, task start or task switch), not on every render tick. Distinguish concurrent Promptbook sessions when possible.
- Use standard terminal output control sequences rather than changing the OS process name. This is the terminal/tab title, not the VS Code terminal's actual product icon; the symbol is text in the title.
- Only emit title controls when stdout is an interactive TTY and terminal capabilities/settings permit it. Never emit into redirected output, logs, JSON/machine-readable responses, or noninteractive CLI usage. Unsupported terminals must continue working without errors or stray visible escape codes.
- Sanitize dynamic text: strip control characters, ESC, BEL, and other unsafe sequences, normalize line breaks and cap length so untrusted task/project names cannot inject terminal commands or misleading multiline titles.
- Respect explicit user/terminal title settings and avoid fighting shell or terminal integrations that manage titles. Provide a way to disable automatic title changes. If Promptbook owns a title change, restore the previous title when supported, or leave title restoration to the shell/terminal on exit; do not claim portable restoration where the terminal cannot report its previous title.
- Cover Bash/Zsh and the VS Code integrated terminal in manual verification; test the generated OSC sequence, sanitization, TTY gating, opt-out and mode/task transitions.

This specification defines desired behavior, not an assertion that it is already implemented.
