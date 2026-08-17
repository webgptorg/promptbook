# `USE GMAIL` does not exist — the "Email summarizer" agent may be narrating a mailbox it never touched

Found while implementing [`prompts/2026-08-0470-agents-server-gmail-action-chips.md`](../prompts/2026-08-0470-agents-server-gmail-action-chips.md) ("when the agent touches any external source, the chip should be shown under the message"). That prompt is now implemented and is **not** blocked by this — but the screenshot it ships with may not be reproducible for the reason below, so verify on the VPS before treating a missing Gmail chip as a bug in the new chips.

## What was verified

The screenshot shows the goal chat of an **Email summarizer** agent on `live.ptbk.io` answering _"I reviewed the daily activity in the authenticated `pavol@ptbk.io` Gmail account and created an unsent summary draft addressed to `manager@ptbk.io`"_. That agent's book is quoted in [`prompts/2026-08-0460-agents-server-gmail.md`](../prompts/2026-08-0460-agents-server-gmail.md) as `USE GMAIL pavol@ptbk.io`.

`USE GMAIL` is not implemented anywhere in this repository:

-   There is no `USE_GMAIL` folder in [`src/commitments`](../src/commitments) — `USE_CALENDAR`, `USE_MCP`, `USE_PROJECT`, `USE_POPUP`, `USE_PRIVACY`, `USE_IMAGE_GENERATOR` and `USE_USER_LOCATION` exist, Gmail does not.
-   A repo-wide search for `USE GMAIL` / `USE_GMAIL` (excluding `node_modules`) matches **exactly one file**: the still-pending prompt `prompts/2026-08-0460-agents-server-gmail.md`, whose specification body is still the `@@@@@@@` placeholder.
-   The local agent runner ([`scripts/run-agent-messages`](../scripts/run-agent-messages)) configures no MCP servers at all, and [`install.sh`](../install.sh) contains no `mcp` configuration either.

## Why this matters

Either the agent really reaches Gmail through harness-level configuration living **outside this repository** (an MCP server registered in the coding harness on the VPS), or it reaches nothing and the answer text is invented.

-   In the first case the new chips already cover it: `mcp__gmail__*` tool calls are detected as a **🔌 Gmail** integration chip by [`resolveAgentMessageTouchedExternalSources.ts`](../src/utils/agent-message-runtime/resolveAgentMessageTouchedExternalSources.ts).
-   In the second case **no chip can ever appear**, correctly — nothing external was touched — and the real defect is an agent asserting work it did not do, which is considerably worse than a missing chip.

An unimplemented commitment does not stop an agent from answering as if it were implemented: `USE GMAIL` is simply an unrecognized line in the agent source, so the model reads it as an instruction it is expected to satisfy and writes a plausible summary.

## Recommendation

Check the harness configuration of the machine serving `live.ptbk.io` for a Gmail MCP server before filing any follow-up about the chips. If there is none, the finished message in that goal chat is fabricated, and the pending `USE GMAIL` prompt should be specified and implemented rather than re-dispatching chip work. Related: [`2026-08-0600-removed-commitments-leave-unreachable-server-tools.message.md`](./2026-08-0600-removed-commitments-leave-unreachable-server-tools.message.md).
