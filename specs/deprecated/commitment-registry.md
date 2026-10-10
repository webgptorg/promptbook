# Agent commitment registry (historical)

> Historical specification retained from the older Agents Server specs. Language principles remain useful, but old paths, server routes and registry details are not the current coder contract; see the [archive policy](_index.md).

[Historical index](_index.md) · [Dictionary](../dictionary.md)

The commitment registry is the single source of truth for the language. Keywords are case-insensitive per definition below; singular/plural forms and listed aliases are equivalent. A compatible implementation MUST support:

| Commitment (aliases)                                   | Effect                                                                                                                                        |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `PERSONA` / `PERSONAE`                                   | Describes who the agent is; contributes to the system message (legacy fallback for the profile description).                                    |
| `GOAL` / `GOALS`                                         | The agent's objective; the last one becomes the profile `personaDescription`.                                                                   |
| `KNOWLEDGE`                                              | Attaches a knowledge source (URL, file) or inline knowledge; sources are indexed for retrieval (see Preparation (historical page: `agents/preparation-and-caching.md#knowledge-indexing`)). |
| `RULE` / `RULES`                                         | Hard behavioral constraint in the system message.                                                                                               |
| `STYLE` / `STYLES`                                       | Writing style instructions.                                                                                                                     |
| `LANGUAGE` / `LANGUAGES`                                 | Response language constraint.                                                                                                                   |
| `WRITING SAMPLE`, `WRITING RULES` / `WRITING RULE`       | Style-by-example instructions.                                                                                                                  |
| `SAMPLE` / `EXAMPLE`                                     | Example conversations (question/answer pairs surfaced in the profile).                                                                          |
| `FORMAT` / `FORMATS`                                     | Output format constraints.                                                                                                                      |
| `TEMPLATE` / `TEMPLATES`                                 | Response templates.                                                                                                                             |
| `FROM`                                                   | Inheritance from a parent agent (see [Inheritance and imports](agents/source-resolution.md)). `FROM VOID` disables the implicit ancestor. |
| `IMPORT` / `IMPORTS`                                     | Textual inclusion of another agent's source.                                                                                                    |
| `MODEL` / `MODELS`                                       | Selects the LLM (and parameters like temperature).                                                                                              |
| `ACTION` / `ACTIONS`                                     | Declares actions the agent can perform (tool-like).                                                                                             |
| `META IMAGE` (`IMAGE`)                                   | Avatar/profile image URL (see [Avatars](agents/avatars-and-visuals.md)).                                                                        |
| `META AVATAR`, `META VISUAL`                             | Built-in avatar visual identifier.                                                                                                              |
| `META COLOR` (`COLOR`), `META FONT` (`FONT`)             | Brand color / font of the agent page.                                                                                                           |
| `META LINK`                                              | Related links shown on the profile.                                                                                                             |
| `META DOMAIN` (`DOMAIN`)                                 | Custom domain claim for the agent (see Servers and multi-tenancy (historical page: `servers-and-multi-tenancy.md#custom-domains`)).                                |
| `META DISCLAIMER`                                        | Markdown disclaimer users must accept before chatting (enforced; see Public agent API (historical page: `api/public-agent-api.md#meta-disclaimer`)).               |
| `META INPUT PLACEHOLDER`                                 | Placeholder text of the chat input.                                                                                                             |
| `META VISIBILITY`                                        | Sets the agent visibility (historical page: `agents.md#visibility`) from source.                                                                                  |
| `META VOICE` (`VOICE`)                                   | Voice used for TTS (see Voice (historical page: `chat/voice.md`)).                                                                                                |
| `META DESCRIPTION`                                       | Profile description override.                                                                                                                  |
| `META FULLNAME`                                          | Full display name of the agent; defaults to the agent name.                                                                                     |
| `META ID`                                                | Permanent id of the agent; written and stripped by persistence, not by hand.                                                                     |
| `MESSAGE`, `INITIAL MESSAGE`, `USER MESSAGE`, `AGENT MESSAGE`, `INTERNAL MESSAGE` | Scripted messages; `INITIAL MESSAGE` is shown when a chat starts.                                                     |
| `MESSAGE SUFFIX`                                         | Markdown appended to every agent reply (streamed after the model output; see Streaming protocol (historical page: `chat/streaming-protocol.md`)).                  |
| `SCENARIO` / `SCENARIOS`                                 | Multi-step scripted scenarios.                                                                                                                  |
| `NOTE` / `NOTES` / `COMMENT` / `NONCE` / `TODO`          | Ignored by compilation (documentation only).                                                                                                    |
| `DELETE` / `CANCEL` / `DISCARD` / `REMOVE`               | Cancels a previously declared commitment.                                                                                                       |
| `DICTIONARY`                                             | Terminology definitions.                                                                                                                        |
| `OPEN`                                                   | Marks the book as openly self-improvable; carries teacher instructions (see [Self-learning](agents/self-learning.md)).                           |
| `CLOSED`                                                 | Locks the book against self-learning.                                                                                                           |
| `TEAM`                                                   | Declares teammate agents the agent can talk to (adds delegation tools; referenced as `{Agent Name}`; may cross servers).                         |
| `USE USER LOCATION` (`USER LOCATION`)                    | Injects the user's location context.                                                                                                            |
| `USE CALENDAR` (`CALENDAR`)                              | Grants calendar tools (Calendar (historical page: `integrations/calendar.md`)).                                                                                    |
| `USE POPUP` (`POPUP`)                                    | Grants popup UI interactions.                                                                                                                    |
| `USE IMAGE GENERATOR`                                    | Grants image generation.                                                                                                                         |
| `USE MCP` (`MCP`)                                        | Connects external MCP servers as tools.                                                                                                          |
| `USE PRIVACY` (`PRIVACY`)                                | Privacy constraints on data handling.                                                                                                            |
| `USE PROJECT` (`PROJECT`)                                | Binds GitHub repositories (GitHub projects (historical page: `integrations/github-projects.md`)).                                                                  |
| `EXPECT`, `BEHAVIOUR(S)`, `AVOID`, `AVOIDANCE`, `CONTEXT` | Reserved keywords — parsed but not yet implemented (MUST be accepted without error).                                                            |

## Historical dictionary definition

## Commitments


Commitments are basic syntax elements that add specific functionalities to AI agents written in `book` language.

-   They are used in `agentSource`, there are commitments like `GOAL`, `RULE`, `KNOWLEDGE`, `USE CALENDAR`, `USE PROJECT`, `META IMAGE`, `CLOSED`, etc.
-   They are in the folder `src/commitments`.
-   Each commitment starts with a keyword, e.g. `GOAL`, `KNOWLEDGE`, `USE PROJECT`, etc. on a beginning of the line and ends by a new commitment or the end of the book.
-   There is a general pattern that the commitment keyword is followed by a space and then by the content of the commitment, for example:
    -   `GOAL You are a helpful assistant that helps with cooking recipes.`
    -   `USE MCP https://mcp.example.com/server`
-   In the commitment context, you can reference external agents, for example:
    -   `TEAM You can talk to {Criminal lawyer} and {Financial advisor}`

## Related historical specifications

- [Agent Book syntax](book-language.md)
- [Agent compilation](agent-compilation.md)
- [Book documentation](book-documentation.md)
