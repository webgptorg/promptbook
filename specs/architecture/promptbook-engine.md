# Promptbook Engine boundary

The Agents Server is built on the **Promptbook Engine**, a framework-agnostic TypeScript library (the
repository's `/src`). This document defines the boundary: what the server relies on the Engine for, and
what the server adds. A re-implementation may substitute any engine that fulfills this contract.

## What the Engine owns

- **Book language** — parsing (`parseAgentSource`) and compilation (`createAgentModelRequirements`) of
  [agent source](../book-language.md) into [model requirements](../agent-model-requirements.md).
- **Commitments** — the registry of [commitments](../commitments.md), their apply steps, and the
  script-callable **tool functions** they contribute.
- **Execution tools** — abstractions for calling LLMs (`LlmExecutionTools`), a filesystem, executables,
  scrapers, and scripting, bundled as an `ExecutionTools` object.
- **Agent collections** — an `AgentCollection` abstraction for listing/reading/updating agents (the server
  supplies a database-backed implementation).
- **Book-language documentation** — the generator behind [`/api/docs/book.md`](../api/misc-api.md).

## What the Server provides to the Engine

- **A server-scoped `ExecutionTools`** (`$provideExecutionToolsForServer`) assembled from registered
  providers, with an LLM cache backed by the [`LlmCache`](../data-model/misc.md) table.
- **A database-backed agent collection** (`$provideAgentCollectionForServer`) so the Engine's
  composition/reference features read the server's agents.
- **A server reference resolver** for compact `{Agent}` references and federation. See
  [References & composition](../agents/references-and-composition.md).
- **Runtime tool implementations** for capabilities that need server context (chat attachments, progress
  cards, browser, calendar, email, spawn, project, timeout). See
  [Tools & capabilities](../features/tools-and-capabilities.md).

## LLM providers

The server registers a set of provider integrations; their models populate the "available models" used for
[model selection](../agent-model-requirements.md):

- Anthropic Claude, Azure OpenAI, OpenAI, OpenAI Assistant, OpenAI-compatible, Deepseek, Google, Ollama.

Provider metadata (model lists, pricing) is registered as a side effect at startup. LLM calls are wrapped
in a **cache** (`cacheLlmTools`) persisted in the `LlmCache` table (keyed by a request hash), so identical
requests reuse results. Provider keys come from environment variables (e.g. `OPENAI_API_KEY`).

## Scrapers & knowledge

For [knowledge](../agents/knowledge.md) ingestion the Engine's scrapers (website, PDF, markdown, document,
markitdown) turn URLs/files into text; the server orchestrates indexing into provider vector stores and
tracks source hashes (`VectorStoreKnowledgeSourceHashes`).

## Versioning

Each agent row records the `promptbookEngineVersion` used at its last update, and the Book language carries
its own `BOOK_LANGUAGE_VERSION`. These let the server reason about which compiler produced a stored
artifact.

## Related specs

- [Book language](../book-language.md) · [Commitments](../commitments.md) ·
  [Agent model requirements](../agent-model-requirements.md)
- [Agent preparation](../agents/preparation.md) · [Runners](../chat/runners.md) ·
  [Tools & capabilities](../features/tools-and-capabilities.md)
