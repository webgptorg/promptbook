# Commitments

**Commitments** are the vocabulary of the [Book language](./book-language.md). Each commitment is one
directive that starts with a keyword at the beginning of a line and adds a specific behavior, capability,
or profile attribute to an [agent](./agent.md).

General shape: `KEYWORD <content>`, e.g. `RULE Always answer in English.` or
`USE SEARCH ENGINE Search only in French.`. Content may reference other agents with
`{Agent Name}` tokens (see [References & composition](./agents/references-and-composition.md)).

Each commitment definition provides: a keyword `type` (with optional aliases and a plural form), a
one-line description, an icon, parse regexes, an optional deprecation/placeholder status, an
`applyToAgentModelRequirements` step (how it mutates the [compiled requirements](./agent-model-requirements.md)),
and optionally runtime **tool functions** it contributes. The live, exhaustive catalog — including the
exact regexes and per-commitment docs — is generated at [`/api/docs/book.md`](./api/misc-api.md).

## How commitments are applied

- **Parse pass** (`parseAgentSource`) reads a hardcoded subset for cheap profile/basic info.
- **Compilation pass** (`createAgentModelRequirements`) applies **every** commitment in order, each
  mutating the accumulating model requirements (system message, prompt suffix, tools, samples, model
  params, `isClosed`, `parentAgentUrl`, and a per-commitment `_metadata` bag).
- When multiple commitments of the same kind exist, later ones generally **override or append** (documented
  per commitment — e.g. only the **last** `GOAL` stays effective; `SCENARIO`/`META TYPE` prefer the last).

Commitments carry status flags surfaced in the catalog: **deprecated** (with a `replacedBy` pointer),
**low-level** (use carefully), and **placeholder / not-yet-implemented**.

## Catalog

Grouped by role. Deprecated aliases are noted; prefer the non-deprecated form.

### Profile & identity

| Keyword | Purpose |
|---|---|
| `GOAL` (`GOALS`) | Define the effective agent **goal**; when multiple exist, only the last stays effective. Preferred source of the agent description. |
| `PERSONA` (`PERSONAE`) | *Deprecated* legacy profile commitment. Prefer `GOAL`. |
| `META` | Set meta-information about the agent (IMAGE, LINK, TITLE, DESCRIPTION, …) — generic form. |
| `META IMAGE` | Set the agent's profile image URL. |
| `META AVATAR` | Set the agent's built-in avatar visual (see [avatars](./features/customization.md)). |
| `META COLOR` | Set the agent's accent color or gradient. |
| `META FONT` | Set the agent's font. |
| `META DISCLAIMER` | Markdown disclaimer users must agree to before chatting (see [disclaimers](./chat/message-lifecycle.md)). |
| `META DOMAIN` | Set the agent's canonical domain/host (custom-domain routing). |
| `META INPUT PLACEHOLDER` | Custom placeholder text in the chat input. |
| `META LINK` | Profile/source links for the person the agent models. |
| `META VISIBILITY` | Set whether the agent is `PRIVATE`, `UNLISTED`, or `PUBLIC`. |
| `META VOICE` | Select the ElevenLabs voice ID for this agent (see [voice](./features/voice.md)). |
| `INITIAL MESSAGE` | The first message shown to the user when a chat starts. |
| `MODEL` (`MODELS`) | *Low-level*: explicit model selection and technical parameters. |

### Behavior & content

| Keyword | Purpose |
|---|---|
| `RULE` (`RULES`) | Add behavioral rules the agent must follow. |
| `KNOWLEDGE` | Add domain **knowledge** via inline text or external sources (RAG). See [Knowledge](./agents/knowledge.md). |
| `SCENARIO` (`SCENARIOS`) | Define specific situations/contexts; later scenarios have higher priority. |
| `WRITING RULES` | Writing-only constraints (tone, length, formatting, emoji usage). |
| `WRITING SAMPLE` | Explicit sample-only text demonstrating the desired voice. |
| `DICTIONARY` | Define terms and meanings for consistent terminology. |
| `LANGUAGE` (`LANGUAGES`) | Language(s) the agent should use. |
| `MESSAGE` (`MESSAGES`) | Include prior assistant/user messages as conversation history (also `USER MESSAGE`, `AGENT MESSAGE`, `INTERNAL MESSAGE`). |
| `MESSAGE SUFFIX` | Hardcoded suffix appended to every assistant response. |
| `COMPONENT` | Define a UI component the agent can render in chat. |
| `NOTE` | Developer-facing note; no behavioral effect. |
| `STYLE` (`STYLES`) | *Deprecated* — prefer `WRITING RULES`. |
| `FORMAT` (`FORMATS`) | *Deprecated* — prefer `WRITING SAMPLE`/`WRITING RULES`. |
| `TEMPLATE` (`TEMPLATES`) | *Deprecated* — prefer `WRITING SAMPLE`/`WRITING RULES`. |
| `SAMPLE` (`EXAMPLE`) | *Deprecated* alias for `WRITING SAMPLE`. |
| `ACTION` | *Deprecated* — prefer concrete `USE *`. |
| `DELETE` | *Unfinished/low-level*: remove or disregard information. |

### Self-modification

| Keyword | Purpose |
|---|---|
| `OPEN` | Allow the agent to be modified by conversation (default); optionally guide the "teacher". |
| `CLOSED` | Prevent the agent from being modified by conversation (sets `isClosed`). See [self-learning](./features/user-memory.md). |

### Capabilities / tools (`USE *`, `MEMORY`, `WALLET`)

Each of these both injects system-message guidance and registers runtime **tool functions**. See
[Tools & capabilities](./features/tools-and-capabilities.md) for how the server implements each tool.

| Keyword | Capability |
|---|---|
| `USE BROWSER` | Browser tools for accessing internet information (Playwright-backed). |
| `USE SEARCH ENGINE` (`USE SEARCH`) | A search-engine tool. |
| `USE DEEPSEARCH` | Deeper, multi-step internet research. |
| `USE IMAGE GENERATOR` | Emit markdown image placeholders the UI turns into generated images. |
| `USE EMAIL` | Outbound email via a wallet-backed SMTP configuration. |
| `USE CALENDAR` | Read/manage events through Google Calendar. |
| `USE TIME` | Determine the current date and time. |
| `USE USER LOCATION` | Determine the user's location (with browser permission). |
| `USE TIMEOUT` | Scheduled wake-ups plus listing/updating/cancelling timeouts across chats. See [Timeouts](./chat/timeouts-and-scheduling.md). |
| `USE SPAWN` | Create persistent child agents via the create-agent flow. See [spawn_agent](./features/tools-and-capabilities.md). |
| `USE PROJECT` | GitHub project tools: read/edit repository files and open pull requests. See [Coding projects](./features/tools-and-capabilities.md). |
| `USE POPUP` | Open a popup window with a specific website. |
| `USE MCP` | Connect the agent to an external [MCP](./api/mcp.md) server. |
| `USE PRIVACY` | Ask to turn [private mode](./architecture/security-and-access.md) on for sensitive conversations. |
| `MEMORY` (`MEMORIES`) | Remember past interactions and user preferences for personalized responses. See [User memory](./features/user-memory.md). |
| `WALLET` | Persistent private credential storage (tokens, logins, cookies), scoped per agent or globally. See [Wallet](./features/wallet.md). |

### Composition

| Keyword | Purpose |
|---|---|
| `FROM` | Inherit agent source from another agent (`FROM {Void}` = explicit "no parent"). |
| `IMPORT` (`IMPORTS`) | Import content from another agent or a generic text file. |
| `TEAM` | Register teammate agents as callable tools (`TEAM You can talk to {Lawyer} and {Advisor}`). |

See [References & composition](./agents/references-and-composition.md) for reference resolution,
inheritance/import chain resolution, teammate tool generation, and pseudo-agents (`{User}`, `{Void}`).

## Extending the vocabulary

Commitments are a registry. Adding a capability to agents means adding a commitment definition (keyword,
docs, apply step, and optional tool functions) — the generated catalog and the parse/compile passes pick it
up automatically. A re-implementation should treat the commitment registry as the extension point for agent
behavior.

## Related specs

- [Book language](./book-language.md) · [Agent model requirements](./agent-model-requirements.md)
- [Tools & capabilities](./features/tools-and-capabilities.md) · [Knowledge](./agents/knowledge.md)
- [References & composition](./agents/references-and-composition.md)
