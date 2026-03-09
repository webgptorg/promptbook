[ ]

[✨🌰] Deduplicate credentials chips per agent message

-   When the agent uses credentials while producing a single assistant message (e.g. multiple tool calls that each require the same credential), show only one credentials chip under that message instead of repeating one chip per tool call.
-   The goal is to reduce UI noise while still clearly communicating which credential types were used.
-   Deduplicate chips by a stable key, ideally based on credential type (e.g. `github`, `smtp`) and, if applicable, a credential scope when it materially changes meaning.
    -   Examples:
        -   Multiple GitHub tool calls in one message => 1 “GitHub credentials used” chip.
        -   GitHub + SMTP used in one message => 2 chips.
        -   Two different GitHub identities used in one message (if supported) => 2 chips, but only if the UI meaningfully distinguishes them; otherwise keep 1 chip and show details on hover/click.
-   The chip copy should be short and consistent (e.g. “GitHub credentials used”, “SMTP credentials used”).
-   Clicking/hovering the chip should optionally reveal details (implementation-defined) without exposing secrets:
    -   credential type
    -   which tool(s) used it (optional)
    -   last 4 / friendly name (optional, only if already present in product elsewhere)
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🌰] baz

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🌰] baz

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🌰] baz

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🌰] baz

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)
