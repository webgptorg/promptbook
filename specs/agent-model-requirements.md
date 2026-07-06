# Agent model requirements

**Agent model requirements** are the **compiled** form of an [agent](./agent.md) — the "executable" output
produced from the [agent source](./book-language.md) by applying every [commitment](./commitments.md) in
order. Where the source is the human-editable truth, model requirements are the machine-ready instructions
that drive the LLM for a chat turn.

Produced by the Engine's `createAgentModelRequirements(agentSource, modelName?, availableModels?, llmTools?, options?)`.

## Shape

| Field | Type | Meaning |
|---|---|---|
| `systemMessage` | string | The system prompt defining behavior/personality. Accumulated from `PERSONA`/`GOAL`, `RULE`, `KNOWLEDGE`, `USE *` guidance, etc. |
| `promptSuffix` | string | Text appended to **every user prompt** (after the user's input, before tools/messages) so commitments can re-emphasize critical rules. |
| `modelName` | string | The model to use. |
| `importedAgentUrls?` | string[] | Agent URLs pulled in via `IMPORT`. |
| `importedFileUrls?` | string[] | File URLs/paths pulled in via `IMPORT`. |
| `knowledgeSources?` | link[] | Knowledge source links the agent can use (RAG). See [Knowledge](./agents/knowledge.md). |
| `samples?` | `{question, answer}[]` | Sample conversations. |
| `temperature?` / `topP?` / `topK?` | number | Sampling parameters. |
| `tools?` | tool-definition[] | LLM tool definitions available to the agent (from capability commitments). |
| `mcpServers?` | string[] | External [MCP](./api/mcp.md) servers to connect to. |
| `parentAgentUrl` | string \| null | Parent to inherit from (`FROM`), or `null` for no parent. |
| `isClosed` | boolean | Whether the agent may **not** be modified by conversation (`CLOSED`). |
| `_metadata?` | record | Arbitrary per-commitment storage; each commitment may stash its own data. |

## Model selection

- If a `modelName` is given, it is used directly.
- If `availableModels` + `llmTools` are provided **and** no `modelName`, the Engine derives the best model
  from the agent's description (last `GOAL` / deprecated `PERSONA`, falling back to the name) via
  `preparePersona`, then falls back to the first available `CHAT` model.

The server registers a set of LLM providers whose models populate `availableModels`; see
[LLM providers & execution tools](./architecture/promptbook-engine.md).

## Where the server uses them

- **Chat execution** — the compiled requirements become the prompt/tools for the model call in a
  [chat job](./chat/execution-model.md).
- **Preparation** — `preparedModelRequirements` is cached on the agent row keyed by `agentHash` and only
  recomputed during explicit [preparation](./agents/preparation.md), not on every edit.
- **Inspection endpoints** — [`/agents/:name/api/model-requirements`](./api/agent-chat.md) exposes the
  compiled requirements, and `/agents/:name/api/model-requirements/system-message` exposes just the system
  message (used by the OpenAI-compat and system-message views).

## Relationship to raw model requirements

`AgentModelRequirements` is an agent-oriented superset of the Engine's generic model-requirements concept
(it additionally carries `isClosed` and `parentAgentUrl`, which describe the agent rather than a single
model call). A re-implementation should treat it as the stable contract between "compiling an agent" and
"running a chat turn".

## Related specs

- [Agent](./agent.md) · [Book language](./book-language.md) · [Commitments](./commitments.md)
- [Agent preparation](./agents/preparation.md) · [Chat execution](./chat/execution-model.md)
- [Promptbook Engine boundary](./architecture/promptbook-engine.md)
