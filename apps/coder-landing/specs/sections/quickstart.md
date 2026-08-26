# Section: Quickstart

Anchor `#quickstart`. Sits on the lighter panel background (see [`../page-structure.md`](../page-structure.md)). Walks the visitor **from installation to the coder server** — every step pairs an explanation with a copyable [terminal block](../components/terminal-block.md).

**Heading**: `From install to autopilot in five steps` — "install" in Promptbook Green, "autopilot" in Promptbook Blue.

Steps are an ordered list; each step is a 2-column row on desktop (text left, terminal right), stacked on mobile. Each step has a numbered circle badge (Promptbook Blue fill).

Commands are the canonical ones from [`../content/commands.md`](../content/commands.md).

| # | Title                              | Command                | Description must mention                                                                                       |
| - | ---------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1 | Install Promptbook                 | `INSTALL_COMMAND`      | `ptbk coder` ships with the `ptbk` package; global install (`-g`) is an option                                  |
| 2 | Initialize your project            | `INIT_COMMAND`         | Creates `prompts/` queue, `prompts/done/` archive, default `agents/developer.book` persona, `AGENTS.md` project context, and agent git identity entries in `.env` |
| 3 | Write your backlog as prompts      | `ADD_COMMAND`          | `ptbk coder add` writes one ready-to-run markdown file into `prompts/`; describe the task like you would prompt Claude Code or Codex; supports a piped heredoc for longer descriptions and a no-argument interactive mode |
| 4 | Run the queue                      | `RUN_COMMAND`          | Pick a harness and let it work; each prompt is implemented, verified, committed; `--dry-run` previews the queue |
| 5 | Or keep it running as a server     | `SERVER_COMMAND`       | Never stops; watches `prompts/` for new files; serves a Trello-style kanban board at `localhost:4441`           |
