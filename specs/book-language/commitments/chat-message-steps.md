# CHAT MESSAGE STEPS

[Commitments](_index.md) · [CHAT MESSAGE](chat-message.md) · [App connection](../../app/connection.md)

**Document:** Chat.

### Structured progress metadata

A `CHAT MESSAGE … progress` can be followed by `CHAT MESSAGE STEPS <JSON array>` on one line, before any audio bindings. Each record has `kind` (`reasoning`, `tool`, `note`), `tool` (a name only for a tool step, otherwise `null`), `text`, and `level` (`info`, `warning`, `error`). This is display metadata of the preceding message, never message text, a reference action or a new message. The latest 200 steps are retained; text is bounded to 500 characters and tool names to 128. Bridge secrets are redacted before live display or persistence. Replacing progress replaces its metadata in the same atomic write and preserves following audio and chronological links.

Older progress messages keep their original text. Readers recover steps from the initial bullet block: `thinking:` is reasoning, an MCP name or capitalized tool name is a tool, other bullets are notes. Streamed prose after the blank line is not a step. A trailing unfinished-reply paragraph is an error note. Malformed metadata is diagnosed and falls back to this legacy rendering. Final and ordinary messages expose no steps. `LINK` commitments retain their position among messages for chronological task cards.
