# Section: Quickstart

Anchor `#quickstart`. Sits on the lighter panel background (see [`../page-structure.md`](../page-structure.md)). Walks the visitor **from installation to the coder server** — every step pairs an explanation with a copyable [terminal block](../components/terminal-block.md).

The initialization step also explains the generated `prompts/README.md`: an offline guide to PRDs, annotations,
templates, traces, and the authoring/review lifecycle, including a sample and a manual or alternative-assistant
workflow. No Promptbook account or installation is needed to follow that manual workflow. Repeated init preserves
customized guides, and the README never becomes a runnable task. Keep the detailed reference in the packaged CLI
template rather than duplicating it on the landing page.

**Heading**: `From install to autopilot in six steps` — "install" in Promptbook Green, "autopilot" in Promptbook Blue.

Steps are an ordered list; each step is a 2-column row on desktop (text left, terminal right), stacked on mobile. Each step has a numbered circle badge (Promptbook Blue fill).

Commands are the canonical ones from [`../content/commands.md`](../content/commands.md).

Initialization also creates editable `agents/lawyer.book` and `agents/copywriter.book`. Both are default TEAM advisers
of Developer and Planner and inherit the shared Adam core. Repeat init adds missing files and helper references
even when package scripts already exist, preserving existing content and reporting unresolved artifacts.

| #   | Title                            | Command           | Description must mention                                                                                                                                                                                                                                                                                                                                                  |
| --- | -------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Install Promptbook               | `INSTALL_COMMAND` | `ptbk coder` ships with the `ptbk` package; global install (`-g`) is an option                                                                                                                                                                                                                                                                                            |
| 2   | Initialize your project          | `INIT_COMMAND`    | Creates `prompts/`, `prompts/done/`, editable Developer and Planner Books, shared Adam, `AGENTS.md`, agent Git identity entries in `.env`, and local ignore rules; missing role Books are restored even when scripts already exist; existing Books, scripts, settings and context are preserved; adds `coder:plan` when absent; new role scripts omit redundant `--agent` |
| 3   | Discuss features with Planner    | `PLAN_COMMAND`    | Planner reads the repository, discusses multiple topics and previews PRDs; `/save` accepts reviewed changes, `/draft` uses the supported `[-]` marker, and `/exit` ends without implementation; existing pending PRDs can be revised                                                                                                                                      |
| 4   | Or add a task from a description | `ADD_COMMAND`     | `coder add` remains the lightweight description-to-prompt command, supporting piped descriptions and optional interactive description entry; a status checkbox is optional in hand-authored tasks                                                                                                                                                                         |
| 5   | Run the queue                    | `RUN_COMMAND`     | Uses local Developer by default, with optional `--agent` override; pick a harness and automatically use its current flagship; it implements one prompt, verifies it, commits it, then starts the next one; `ptbk coder list` shows the ready queue for all agents grouped by priority first                                                                               |
| 6   | Or keep it running as a server   | `SERVER_COMMAND`  | Starts the complete Agent Server and autonomous multi-agent PRD queue with one command; fills missing setup, chats with all Books, commits Book/folder edits, persists project SQLite state, watches changes while idle, and synchronizes safely. Alias: ptbk coder server; default loopback port 4441; no mandatory harness/agent flag                                   |
