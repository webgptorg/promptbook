# 🤖 ptbk coder landing page

Landing page for [`ptbk coder`](../../src/cli/cli-commands/coder/run.ts) — the Promptbook orchestrator which drives coding agents (Claude Code, OpenAI Codex, GitHub Copilot, Gemini CLI, opencode, Cline) through a queue of plain-markdown prompts.

-   Runs on http://localhost:4025/
-   Dark mode only, English only, responsive for desktop and mobile
-   Uses the official [Promptbook branding](https://www.ptbk.io/branding)

## Development

```bash
npm run dev
```

## Specs

The [`specs/`](./specs/README.md) folder is the single source of truth for the functionality of this page. It is written so that the page can be re-implemented 1:1 from the specs alone, without this source code.

When you change the page, update the corresponding spec — and vice versa.
