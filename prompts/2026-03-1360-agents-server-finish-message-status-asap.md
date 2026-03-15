[ ]

[⏱️✅] Switch agent message status to complete ASAP

-   *(@@@@ Written by agent)*
-   In the Agents Server chat UI, the agent reply is visibly finished (all tokens rendered) but the message status stays as "cut"/"incomplete" for ~10 seconds before switching to "complete".
-   Goal: As soon as we know the model output stream is finished, update message status from "incomplete" to "complete" immediately (or within < 250ms), without waiting for any extra timers / delayed markers.
-   Do a root-cause analysis and fix the underlying reason rather than masking it with UI heuristics.
-   Likely root causes to investigate (@@@ confirm in code):
    -   Server closes the HTTP stream late (e.g., artificial delays like `forTime(100)` / buffering / flush behavior).
    -   Client waits for a trailing sentinel like `[DONE]` / `\n\n[DONE]` instead of relying on stream `done` / close event.
    -   Client status is tied to a "final message persisted" event (DB write, tool-call reconciliation, background tasks) instead of stream completion.
    -   Team/agent orchestration sends a final event later than the content (e.g., commitment / usage / metadata finalized at the end).
-   Define precise semantics:
    -   "incomplete" = still receiving more tokens OR stream is open.
    -   "complete" = stream closed OR explicit final event received.
    -   "cut" = aborted by user, timeout, network error, server error (not "just waiting").
-   Implementation requirements:
    -   The server must emit an explicit "final" event as soon as the LLM finishes OR close the stream immediately after last token.
    -   The client must transition to "complete" on stream close / final event, not on a delayed timer.
    -   Ensure tool-call sequences still behave: intermediate tool events can keep status "incomplete" until final event.
    -   Add telemetry: measure `t(last_token_rendered -> status_complete)` and log/track when it exceeds threshold.
-   Acceptance criteria:
    -   On a normal chat without tool calls, status becomes "complete" within 250ms after the last token appears.
    -   On chats with tool calls, status becomes "complete" within 250ms after the final assistant token is rendered.
    -   No regression: aborted streams still show "cut"; errors show "error"; long-running tool steps keep an "ongoing" indicator.
-   QA steps:
    -   Reproduce the current ~10s delay on production/staging and record a HAR + screen capture.
    -   Verify the delay is removed after fix in at least: Chrome, Safari, iOS Safari.
    -   Test slow network / offline / reconnect: status eventually becomes correct.
-   You are working with:
    -   [Agents Server](apps/agents-server)
    -   Streaming endpoint(s) and event format (@@@): likely [apps/agents-server/src/app/api/openai/**] and/or [apps/agents-server/src/app/api/chat-streaming/route.ts]
    -   Chat message state management in UI (@@@): likely [apps/agents-server/src/components/**] and [apps/agents-server/src/hooks/**]
    -   Message persistence and status fields (@@@): likely [apps/agents-server/src/database/**] and [apps/agents-server/src/app/api/messages/**]
    -   Add the change into the [changelog](changelog/_current-preversion.md)
