[🛡️🧹] Low-level commitments & commitments alias cleanup

Overview: Create a generic "low-level" flag for commitments (decoupled from `MODEL`), remove `MODEL` from the main book/manual output (/api/docs/book.md), surface low-level commitments in a distinct bottom section of the manual and editor (with special styling), highlight them in the editor but exclude them from autocompletion suggestions, and remove alias variants from suggestion lists while keeping aliases in metadata for backward compatibility.

-   Add a new generic commitment flag `isLowlevel`. This must be decoupled from the `MODEL` commitment and usable for other commitments in the future.
-   API / docs generator: modify /api/docs/book.md generation to exclude commitments with `isLowlevel=true`. Low-level commitments must not be included in book.md Book Language blueprint
-   Book editor:
    -   Highlight low-level commitments in BookEditor in a same way as now
    -   Do NOT include low-level commitments in autocompletion suggestions while typing commitments.
-   Autocomplete / Suggestions:
    -   Remove alias variants (e.g., RULES, RULE) from the suggestion list - only suggest the primary canonical commitment token.
    -   Still render aliases visually where they exist (for example as dimmed secondary text / tooltip), but they must not appear in the prefix-matching suggestions.
    -   Aliases should be lower-visibility across the UI (docs, suggestion hints), and must NOT be included in /api/docs/book.md.
-   Search & indexing: update any server-side suggestion index to store commitments by their canonical primary variant only for suggestion purposes, while retaining aliases in metadata for backward compatibility and highlighting.
-   Files / components likely affected:
    -   You are working with the [Agents Server](apps/agents-server)
-   Acceptance criteria:
    -   Low-level commitments and aliases removed from /api/docs/book.md output.
    -   Low-level commitments and aliases do not appear in autocompletion suggestions.
    -   Low-level commitments still render in the editor with distinct styling and are searchable by their
    -   Canonical name, but aliases do not appear in suggestions.
    -   The parsing itself is not affected, meaning that if an agent source contains a low-level commitment or an alias, it is still parsed and processed correctly, but they are just hidden from suggestions and docs.
