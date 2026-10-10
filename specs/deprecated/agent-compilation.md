# Agent compilation (historical)

> Historical specification retained from the older Agents Server specs. Language principles remain useful, but old paths, server routes and registry details are not the current coder contract; see the [archive policy](_index.md).

[Historical index](_index.md) · [Dictionary](../dictionary.md)

## Two-stage parsing

A compatible implementation MUST provide both stages with the following division of labor:

1. **`parseAgentSource` (synchronous, lightweight)** — extracts the agent profile (historical page: `agents.md#agent-profile`) (name, hash, persona description, initial message, `meta` map, links, parameters, capabilities, samples, knowledge sources). It recognizes commitments syntactically, never performs I/O, and is used everywhere a profile is needed cheaply (listings, headers, routing).
2. **`createAgentModelRequirements` (asynchronous)** — compiles the source into **agent model requirements** by applying each commitment definition in order. This may perform I/O (resolving referenced agents, knowledge indexing). Output shape:
    -   `systemMessage` — the composed system prompt;
    -   `userMessageSuffix` — optional text appended to user prompts;
    -   `modelName` (and optional `temperature` and other model parameters);
    -   `tools` — LLM tool definitions contributed by `USE …`/`TEAM`/`ACTION` commitments.

The server caches the compiled requirements per `agentHash` (`Agent.preparedModelRequirements`, see Preparation and caching (historical page: `agents/preparation-and-caching.md`)) and exposes them for debugging via the model-requirements API (historical page: `api/public-agent-api.md#model-requirements`).

## Related historical specifications

- [Agent Book syntax](book-language.md)
- [Commitment registry](commitment-registry.md)
- [Source resolution](agents/source-resolution.md)
