[x] ~$0.00 20 minutes by GitHub Copilot `claude-sonnet-4.6`

[🧾🔧] Log full raw Message tool context (called + available)

-   You are working with [Agents Server](apps/agents-server)
-   When a user clicks a chat message (e.g., to open raw details / message inspector), the server/client logging should include not only the tool(s) that were actually called, but also the tool(s) that were available for the model at that step.
-   Required logging contents for the raw Message object:
    -   `tool_calls` / called tools: keep existing structure/fields that are already logged.
    -   `available_tools`: add/emit the complete list of tools that were available at that time (even if none were called).
    -   Maintain correlation identifiers already present in the raw Message so developers can match tool availability to a specific model request/turn.
-   Source of truth: the logged data must come from the exact objects used to construct the model request for that message turn (not from UI transformations).
-   Payload size + safety:
    -   If tool definitions are large, log them in a summarized but deterministic form (e.g., tool name + JSON schema hash or first N chars of schema) while still being able to debug mismatches.
    -   Do not log secrets or credentials; redact any sensitive fields if they exist in tool definitions.
-   UX/QA expectations:
    -   Manual QA: select at least one message where tools were called and one where the model had available tools but called none; confirm both cases show `available_tools` in the raw log.
    -   Confirm no performance regression during streaming / message finalization.
-   Add automated coverage where feasible:
    -   Unit test (or integration test) verifying that the raw message inspection payload contains both called tools and available tools for a turn.
-   Missing pieces to confirm during implementation (to avoid wrong assumptions):
    -   Where exactly the “message inspector” is triggered from (UI route/component) and what backend endpoint returns raw message details.
    -   The exact internal field names/types currently used for “called tools” in the raw message object.
    -   Where “available tools” already exist in-memory during the request-building flow (or whether we need to persist it for later inspection).

