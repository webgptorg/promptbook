# Section: Agent personas (Book)

Anchor `#agents`. Shows the default Book roles, the `--agent agents/my-developer.book` override, how tasks can target
the selected agent, and lets the visitor *see* an agent definition in the real Book editor.

`run` and `server` use the project's editable `agents/developer.book`; `plan` uses `agents/planner.book`.
Local changes apply on the next invocation. Explicit `--agent` selections override either role without changing
`--harness` (the coding tool), `--model` or thinking level. A missing default reports its path and requires
`ptbk coder init`; an invalid explicit selection fails without fallback. `coder list` has no default Book filter.

Also explain the project-owned Planner at `agents/planner.book`: Planner discusses requirements and authors PRDs;
Developer implements them. Both use the same implicit Adam inheritance. Planning requires missing Books to be
prepared with `ptbk coder init` and never creates Books during the conversation. A custom `--agent` changes the
persona without changing the command's planning-only write boundary.

## Copy

-   **Heading**: `Give your agent a soul, in plain text` ("soul" in Promptbook Green).
-   **Lead paragraph**: coding and planning use agents written in the **Book language** (link the words "Book language" to https://github.com/webgptorg/book), Promptbook's human-readable language for defining AI agents. Each agent's persona, rules and knowledge live in `.book` files. ptbk coder resolves the selected book's inheritance and imports into the system message of every coding prompt.

## Layout

Two columns on desktop (stacked on mobile):

### Left — the option

1. Intro line: "Override the default role with your own Book using `--agent`:"
2. A [terminal block](../components/terminal-block.md) with the canonical `AGENT_RUN_COMMAND` (see [`../content/commands.md`](../content/commands.md)).
3. Follow-up paragraphs: `ptbk coder init` creates the developer agent at `agents/developer.book` and Adam at `agents/.core/adam.book`. `FROM`, `IMPORT` and `TEAM` resolve `@Name` and `{Name}` by first-line book titles discovered recursively under the selected agent's directory. Paths beginning with `./` or `../` are relative to the declaring book, other paths to cwd, and HTTP(S) book URLs are supported. Missing Adam is created in `.core` beside the selected agent and inherited by default; `FROM @null`, `FROM @void` and their brace forms disable inheritance.
4. Prompt-routing paragraph: a ready task can target that agent with the status line ``[ ] use agent `developer` ``. The selected Book's path, filename, filename without `.book`, and title from its first line all work.
5. Attribution paragraph: a finished task is signed by the agent, not only by the harness, as ``[x] by Developer on OpenAI Codex `gpt-5.6-luna` ``.

### Right — the agent itself

1. Caption above (small monospace, gray): `readonly preview of agents/developer.book`
2. The [readonly Book editor embed](../components/book-editor-embed.md) showing the verbatim source from [`../content/developer-agent.md`](../content/developer-agent.md).
