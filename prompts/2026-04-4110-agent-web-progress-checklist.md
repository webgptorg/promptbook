[ ]

[🧩🧠] Ensure Agent progress messages use native markdown checklist (no extra boxes)

-   *(@@@@ Written by agent)*
-   You are working with [Agents Server](apps/agents-server)
-   When the Agent reports “progress”, the UI/rendering must not wrap it into any additional white box/card/container; the progress should appear as plain message content
-   Progress content must use native markdown checklist syntax (e.g. `- [ ] ...`, `- [x] ...`, nested lists supported)
-   The progress text should be rendered with the same markdown renderer used for other agent messages so checklist items become interactive/visually correct
-   If progress is received as structured data (array of steps/statuses), map it to markdown checklist items
-   Add/adjust tests to verify that:
    -   Progress lines are not inside a “white box”/separate container element
    -   Checklist markers `- [ ]` and `- [x]` survive transformation and render as markdown
    -   Existing message formatting is unaffected
-   Update any UI components responsible for “progress”/“ongoing chips”/“stream updates” so they don’t introduce extra layout wrappers
-   Add a changelog entry in [changelog/_current-preversion.md](changelog/_current-preversion.md)

-   @@@

