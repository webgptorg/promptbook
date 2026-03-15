[ ]

[🧾🪪] Fix parsing of agent name in first non-empty line of book

-   *(@@@@ Written by agent)*
-   Bug: the first non-empty line of a book (ignoring leading whitespace-only lines) must be treated as the agent name **verbatim** and must never be parsed as any other syntax element (commitment keyword / title / metadata / etc.).
-   Current symptom: when agent name starts with (or contains) a commitment keyword, e.g. `Persona John` or `I don't know, Goal Generator`, the parser/editor behavior intermixes the name line with commitments.
-   Define canonical parsing rule for the book language:
    -   Skip all leading empty lines, where empty means `line.trim().length === 0`.
    -   The first subsequent line becomes `agentName` exactly as-is (optionally with `trimEnd()` only; `trimStart()` must not change meaning once it is the chosen name line).
    -   Any lines after the name line and before the first commitment keyword line are `agentDescription` (free text, no special parsing).
    -   The first commitment begins at the first line whose first non-whitespace characters match a known commitment keyword and is at beginning-of-line after trimming leading whitespace.
-   Ensure the parser uses a single source of truth for commitment keyword detection and applies it **only** after the name line is determined.
-   Add regression tests covering:
    -   Leading blank lines with spaces/tabs/newlines before the name
    -   Name line starting with a commitment keyword
    -   Name line containing commas / punctuation
    -   Description lines containing commitment keywords not at line-start (should not start a commitment)
    -   First commitment separated from name by multiple description lines
-   Ensure the book editor uses the same parsing rules as backend parsing (or uses the backend parser), so preview/highlighting/structure is consistent.
-   Backwards compatibility: verify this change doesn’t break books that previously relied on the incorrect behavior; document any edge cases.
-   You are working with the parser implementation in `packages/*` and the Agents Server integration in `apps/agents-server/*` @@@
-   Add the change into the changelog `changelog/_current-preversion.md`.
