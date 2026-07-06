# Book language

**Book language** (internally "Book 2.0") is the domain-specific language every [agent](./agent.md) is
written in. It is plain text, human-readable, and designed to be the single editable source of truth for an
agent's behavior, tools, memory, and profile.

The server ships a **canonical, always-current** rendering of this specification at the runtime endpoint
[`/api/docs/book.md`](./api/misc-api.md) (and `/api/docs/book-language.md`), generated from the live
commitment registry. That generated document is authoritative for exact syntax; this spec describes the
model and how the server consumes it.

## What it solves

- **One source of truth** for behavior, tools, memory, and profile metadata.
- **Composable agents** via `FROM`, `IMPORT`, and `TEAM`.
- **Deterministic compilation** — source is parsed and compiled into model requirements.
- **Portable definitions** — copy, version, and review agents as text.

## Syntax primitives

1. **Agent title** — the **first non-empty line that is not a commitment keyword** becomes the
   [`agentName`](./agent.md#identity-model).
2. **Commitment block** — starts with a [commitment](./commitments.md) keyword at the start of a line and
   continues until the next commitment block, a separator, or end of source. General shape:
   `KEYWORD <content>` (e.g. `PERSONA You are a helpful cooking assistant.`).
3. **Horizontal separator** — lines like `---` split sections; in the Agents Server they can also delimit
   **embedded in-book agents** (see [References & composition](./agents/references-and-composition.md)).
4. **Code fences** — preserved verbatim inside commitment content.
5. **Parameters** — two equivalent notations are parsed: `@parameter` (single word) and
   `{parameter}` / `{parameter with words}` / `{name: description}`.
6. **References** — compact `{Agent Name}` tokens inside commitment content, resolved to agent URLs; plus
   **pseudo-agents** like `{User}` and `{Void}`.

## The two-pass execution & compilation model

The server (and Engine) process source in two passes:

1. **Fast parse pass — `parseAgentSource`** (synchronous). Extracts the agent's basic information: name,
   description (last `GOAL`, falling back to deprecated `PERSONA`), `META*` values, capabilities, samples,
   knowledge sources, links, and parameters. Its purpose is to be quick; its commitment set is hardcoded.
   The result type is the **agent profile / basic information** (see below).

2. **Compilation pass — `createAgentModelRequirements`** (asynchronous). Applies commitments in sequence,
   resolves references and inheritance/import chains, and builds the executable
   [agent model requirements](./agent-model-requirements.md) (system message, prompt suffix, model, tools,
   MCP servers, samples, knowledge sources, temperature, `isClosed`, `parentAgentUrl`, per-commitment
   metadata).

In the Agents Server the full runtime flow around a chat turn is:

1. Resolve scoped references (including in-book references like `{Some Agent}`) with the server's
   [reference resolver](./agents/references-and-composition.md).
2. Resolve inheritance/import chains into an **effective source**.
3. Compile the effective source into model requirements.
4. Execute the chat turn with the resolved tools and runtime adapters (see [Chat](./chat.md)).

## Agent basic information (parse output)

The fast parse produces a structured profile used across the UI and APIs:

- `agentName`, `agentHash`, `permanentId?`
- `personaDescription` — from the last `GOAL` (preferred) or deprecated `PERSONA`.
- `initialMessage` — the `INITIAL MESSAGE` shown when a chat starts.
- `meta` — merged `META*` values: `fullname`, `description`, `disclaimer`, `inputPlaceholder`,
  `messageSuffix`, `image`, `avatar`, `domain`, `font`, `color`, `voice`, `visibility`, plus arbitrary
  keys (later `META TYPE` overrides earlier of the same type).
- `links` — from `META LINK`.
- `parameters` — parsed `@param` / `{param}` tokens.
- `capabilities` — typed capability chips derived from `USE *`, `KNOWLEDGE`, `TEAM`, etc. (each with a
  label + icon); capability types include `browser`, `search-engine`, `knowledge`, `timeout`, `time`,
  `user-location`, `inheritance`, `import`, `image-generator`, `team`, `email`, `popup`, `privacy`,
  `project`, `calendar`, `wallet`.
- `samples` — sample question/answer pairs.
- `knowledgeSources` — `{ url, filename }` records used for citation resolution.

## Mental model: four layers of an agent

1. **Identity/Profile** — title line, last `GOAL` (preferred) or deprecated `PERSONA`, `META*`.
2. **Behavior** — `RULE`, `KNOWLEDGE`, `WRITING SAMPLE`, `WRITING RULES`, deprecated `STYLE`/`FORMAT`/
   `TEMPLATE`/`LANGUAGE`, `GOAL`, samples, messages.
3. **Capability** — `USE *`, `MEMORY`, other tooling commitments.
4. **Composition** — `FROM` inheritance, `IMPORT` reuse, `TEAM` delegation.

## Authoring guidance the server encodes

- Start with a single clear `GOAL`; use `PERSONA` only for legacy backward compatibility.
- Add concrete `RULE`s before adding many tools.
- Prefer `KNOWLEDGE` + an explicit citation rule for high-stakes answers.
- Use `TEAM`/`IMPORT` for specialized responsibilities instead of monoliths.
- If using `MEMORY`, define what must and must not be remembered.
- Add `CLOSED` for deterministic, non-self-modifying behavior.

## Versioning

The language has a version constant (`BOOK_LANGUAGE_VERSION`) surfaced in the generated docs. Commitments
may be marked **deprecated** (with a replacement) or **placeholder / not-yet-implemented**; both states are
reflected in the generated catalog.

## Related specs

- [Commitments](./commitments.md) — the full vocabulary
- [Agent model requirements](./agent-model-requirements.md) — the compiled output
- [References & composition](./agents/references-and-composition.md) — `{Agent}`, `FROM`, `IMPORT`, `TEAM`
- [Book language docs endpoint](./api/misc-api.md) — the live authoritative reference
