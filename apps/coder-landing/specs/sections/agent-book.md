# Section: Agent personas (Book)

Anchor `#agents`. Shows how a run is personalized with `--agent agents/developer.book` and lets the visitor *see* an agent definition in the real Book editor.

## Copy

-   **Heading**: `Give your agent a soul — in plain text` ("soul" in Promptbook Green).
-   **Lead paragraph**: every run can carry a persona written in the **Book language** (link the words "Book language" to https://github.com/webgptorg/book) — Promptbook's human-readable language for defining AI agents. Rules, persona and knowledge live in a `.book` file that is compiled into the system message of every coding prompt.

## Layout

Two columns on desktop (stacked on mobile):

### Left — the option

1. Intro line: "Point **ptbk coder** at any agent file with `--agent`:"
2. A [terminal block](../components/terminal-block.md) with the canonical `AGENT_RUN_COMMAND` (see [`../content/commands.md`](../content/commands.md)).
3. Follow-up paragraph: `ptbk coder init` creates this default developer agent at `agents/developer.book` — edit it like any other file in your repository to change how your agent codes.

### Right — the agent itself

1. Caption above (small monospace, gray): `agents/developer.book — readonly preview`
2. The [readonly Book editor embed](../components/book-editor-embed.md) showing the verbatim source from [`../content/developer-agent.md`](../content/developer-agent.md).
