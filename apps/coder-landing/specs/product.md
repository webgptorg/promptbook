# Product: what `ptbk coder` is

This spec defines the product story every section of the page must be consistent with.

## One-sentence definition

**`ptbk coder` is an orchestrator that drives existing AI coding agents (Claude Code, OpenAI Codex, GitHub Copilot, Gemini CLI, opencode, Cline) through a queue of plain-markdown prompt files — implementing, testing, committing and pushing each task automatically.**

`ptbk coder` is a CLI tool shipped inside the [`ptbk` npm package](https://www.npmjs.com/package/ptbk). It is a **subproduct of Promptbook** (see [`sections/footer.md`](./sections/footer.md) for how this relationship is presented).

## Target visitor

A software developer who:

-   has **never heard of `ptbk coder`** or Promptbook,
-   **may know** Claude Code and/or OpenAI Codex,
-   wants to use AI agents to code and develop software.

Consequence: the page may reference Claude Code / Codex as familiar anchors, but must explain everything specific to `ptbk coder` from zero. No Promptbook internals may be assumed.

## Positioning

-   `ptbk coder` **does not replace** coding agents — it sits **one level above** them ("harnesses") and keeps them working through a whole backlog unattended.
-   The mental shift to communicate: *from interactive chat sessions* (one task at a time) *to a versioned queue of prompt files* (`prompts/` folder) processed autonomously.
-   Around the agent, `ptbk coder` adds the unattended-operation machinery: test verification with retry feedback, git commits under a dedicated agent identity (optionally GPG-signed), auto pull/push, pacing, priorities, a kanban web UI, and personas defined in the Book language.

## Core workflow (the loop the page must explain)

1. `ptbk coder init` scaffolds the project (see [`content/commands.md`](./content/commands.md)).
2. The developer writes each task as one markdown file in `prompts/`.
3. `ptbk coder run` (or `ptbk coder server`) feeds prompts one by one to the selected harness, with:
    - an optional agent persona from a `.book` file (`--agent`, see [`content/developer-agent.md`](./content/developer-agent.md)),
    - optional project context (`--context`, e.g. `AGENTS.md`).
4. After each prompt: the test command runs (`--test`); failures are fed back to the agent, which retries until green.
5. The changes are committed under the agent git identity; optionally pushed (`--auto-push`).
6. Finished prompts are verified and archived to `prompts/done/` (`ptbk coder verify`).
7. `ptbk coder server` additionally keeps running forever, watches `prompts/` for new files, and serves a Trello-style kanban board (default port 4441).

## Key subcommands

| Command              | Purpose                                                                     |
| -------------------- | --------------------------------------------------------------------------- |
| `ptbk coder init`    | Scaffold `prompts/`, `prompts/done/`, `agents/developer.book`, `AGENTS.md`, `.env` agent-identity entries, `.gitignore`, `package.json` scripts, `.vscode/settings.json` |
| `ptbk coder run`     | Process the prompt queue once, then exit                                     |
| `ptbk coder server`  | Same processing, but never exits; watches for new prompts; serves kanban UI |
| `ptbk coder verify`  | Interactive verification of completed prompts; archives to `prompts/done/`  |

## Tone

Practical, developer-to-developer, no hype. Terminal-first: whenever something can be shown as a command, show it as a command (see [`components/terminal-block.md`](./components/terminal-block.md)).
