# Agents Server — Specifications

This folder is the **single source of truth** for the functionality of the **Promptbook Agents Server**
(the application in [`apps/agents-server`](../apps/agents-server)).

The goal of these specs is to describe **what** the Agents Server does — its behavior, contracts, data,
and lifecycles — precisely enough that the whole system (the server **and** the agents that live on it)
could be re-implemented from these documents alone, **without reading the original source code**.

These specs describe behavior, not implementation. Where a file path is mentioned it is a pointer for
orientation only; a re-implementation is free to organize its code differently as long as the observable
behavior matches.

## How these specs are organized

The most abstract and important concepts live at the **root** of `specs/`. Details live in subfolders.
Every document covers **one** responsibility and links to related documents.

### Start here (core concepts, root level)

- [Agents Server overview](./agents-server.md) — what the system is and its high-level shape
- [Glossary](./glossary.md) — canonical vocabulary used across all specs
- [Agent](./agent.md) — the central entity: what an agent is and its identity model
- [Book language](./book-language.md) — the language agents are written in
- [Commitments](./commitments.md) — the building blocks of the Book language
- [Agent model requirements](./agent-model-requirements.md) — the "compiled" form of an agent
- [Chat](./chat.md) — how a conversation with an agent works

### Subfolders (details)

- [`architecture/`](./architecture/) — app shape, multi-server routing, database, configuration, security
- [`data-model/`](./data-model/) — every database table, grouped by domain
- [`api/`](./api/) — every HTTP endpoint, grouped by area
- [`chat/`](./chat/) — the durable chat execution engine, runners, streaming, timeouts
- [`agents/`](./agents/) — agent lifecycle, references/composition, preparation, knowledge
- [`features/`](./features/) — user-facing and operational features
- [`ui/`](./ui/) — the web UI surface and navigation

## Scope

**In scope:** everything needed to run agents and serve users — agent definition/compilation, the chat
engine, the API surface, auth, configuration, multi-tenancy, tools/capabilities, integrations, admin,
and self-hosting.

**Out of scope / omitted:** dead or experimental code paths not wired into the live product, and the
internal implementation of the Promptbook Engine beyond the contract the server depends on. The Engine is
treated as a dependency and described only at its boundary — see
[Promptbook Engine boundary](./architecture/promptbook-engine.md).

## Conventions used in these specs

- **`UPPER_SNAKE_CASE`** denotes a constant, a status enum value, a metadata key, or an environment variable.
- Table names are written **without** their runtime prefix (e.g. `Agent`); see
  [Database](./architecture/database.md) for the prefixing rule.
- Names like `permanentId`, `agentHash`, `chatId` match the wire/database field names exactly.
- "The Engine" always means the Promptbook Engine; "the server" always means the Agents Server.
