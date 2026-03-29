[x] ~$0.3120 24 minutes by OpenAI Codex `gpt-5.4`

[📖1️⃣] First non-empty line is always agent name (never a commitment)

-   There is a bug in Promptbook “book” agent source parsing where the first line of the book (agent name / title) is sometimes mis-parsed as a commitment when it starts with a commitment keyword.
-   The parsing rule must be:
    -   Ignore all leading empty/whitespace-only lines.
    -   The first subsequent line that contains any non-whitespace characters is **always** the agent name.
    -   This line must be treated as plain text (agent name) and must **never** be interpreted as any syntax element (commitment, keyword, metadata, etc.), even if it starts with a commitment keyword.
-   After the agent-name line:
    -   Any following lines up to the first commitment keyword-at-bol (beginning of line) are treated as optional agent description text.
    -   The first commitment starts at the first line that matches commitment-start syntax at BOL.
    -   Next commitments start at subsequent commitment keyword lines, until EOF.
-   Examples that must work:
    -   `Persona John` should result in agent name `Persona John` (not a `Persona` commitment).
    -   `I don't know, Goal Generator` should result in agent name `I don't know, Goal Generator` (not a `Goal` commitment).

```book
Persona John

PESONA This is the first real commitment
```

```book
Goal maker

GOAL This is the first real commitment
```

-   Add/adjust unit tests that cover:
    -   Leading whitespace-only lines before the agent name.
    -   Agent-name line starting with every supported commitment keyword.
    -   Books with/without description block.
    -   Windows `\r\n` and Unix `\n` newlines.
-   Ensure the same parsing behavior is used everywhere the “book” is interpreted (server-side parsing, editor preview, indexing, etc.) to avoid inconsistencies.
-   Implementation notes:
    -   Prefer changing the parser’s entry-point (prelude parsing) to explicitly “consume agent name line first”, then parse the rest.
    -   Avoid regex heuristics that can reclassify the first non-empty line.
-   Add the change into the [changelog](changelog/_current-preversion.md)

