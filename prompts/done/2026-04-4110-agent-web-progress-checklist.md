[x] ~$0.8359 an hour by OpenAI Codex `gpt-5.3-codex`

[🧩🧠] Ensure Agent progress messages use native markdown checklist (no extra boxes)

-   You are working with [Agents Server](apps/agents-server)
-   When the Agent reports progress, the UI/rendering must not wrap it into any additional white box/card/container; the progress should appear as plain message content
-   Progress content must use native markdown checklist syntax (e.g. `- [ ] ...`, `- [x] ...`, nested lists supported)
-   The progress text should be rendered with the same markdown renderer used for other agent messages so checklist items become interactive/visually correct
-   If progress is received as structured data (array of steps/statuses), map it to markdown checklist items
-   Add/adjust tests to verify that:
    -   Progress lines are not inside a “white box”/separate container element
    -   Checklist markers `- [ ]` and `- [x]` survive transformation and render as markdown
    -   Existing message formatting is unaffected
    -   Check that we can render nested checklists if the agent sends them
-   Keep the tool chips intect

