[🛡️📘] Low-level commitments & alias cleanup

-   *(@@@@ Written by agent)*

Overview: Create a generic "low-level" flag for commitments (not tied to MODEL), remove MODEL from the main book/manual, move low-level commitments to a distinct bottom section in the manual and highlight them in the editor while excluding them from autocompletion. Remove alias variants from editor suggestions and make aliases low-visibility alternatives across the system.

-   Add a new generic commitment flag `low_level` (boolean) or a `flags` bitmask enum on the Commitment/AgentCommitment model. This must be decoupled from the MODEL commitment and usable for other commitments in the future.
-   Data migration: decide whether existing MODEL commitments should be marked `low_level=true` automatically. (Decision required)
-   API / docs generator: modify /api/docs/book.md generation to exclude commitments with `low_level=true`. Low-level commitments must not be included in book.md.
-   Manual: display low-level commitments in a special bottom section titled `Low-level commitments` with a distinct color or tag. They should be visually separated from the main manual content and marked as non-recommended for inclusion. (Need color / style guidance)
-   Book editor:
    -   Highlight low-level commitments visually (color / badge) in the editor UI.
    -   Show them in a special bottom section or collapsed area in the editor `Commitments panel` labelled "Low-level commitments".
    -   Do NOT include low-level commitments in autocompletion suggestions while typing commitments.
    -   Provide a per-commitment toggle in the editor to mark/unmark `low_level`.
-   Autocomplete / Suggestions:
    -   Remove alias variants (e.g., RULES, RULE) from the suggestion list — only suggest the primary canonical commitment token.
    -   Still render aliases visually where they exist (for example as dimmed secondary text / tooltip), but they must not appear in the prefix-matching suggestions.
    -   Aliases should be lower-visibility across the UI (docs, suggestion hints), and must NOT be included in /api/docs/book.md.
-   Search & indexing: update any server-side suggestion index to store commitments by their canonical primary variant only for suggestion purposes, while retaining aliases in metadata for backward compatibility and highlighting.
-   Storage & model changes:
    -   Add columns / schema migration for `low_level` flag and (if required) normalize aliases storage to a single canonical name + aliases array in JSONB.
    -   Ensure existing code paths that look up commitments by alias still resolve to the canonical commitment when executing rules, but aliases are not surfaced in editor suggestions.
-   UI/UX details required from product:
    -   Exact color / badge style for low-level items.
    -   Where to show the "Low-level commitments" section in the manual and editor (collapsed by default? pinned to bottom?).
    -   Decide automatic migration policy for MODEL.
-   Backwards compatibility:
    -   Ensure agents that rely on MODEL continue to work: the engine should treat MODEL as a normal commitment in runtime and evaluate it; only presentation (manual / book.md / suggestions) should change.
-   Tests and QA:
    -   Unit tests for migration and model changes.
    -   Integration tests for API docs generation to confirm low_level items are excluded.
    -   E2E test for editor suggesting only canonical commitments and highlighting low-level ones.
-   Files / components likely affected:
    -   apps/agents-server (models/Commitment, migrations, suggestion indexing)
    -   apps/book-editor (autocomplete, UI highlighting, commitments panel)
    -   packages/docs-generator or /api/docs/book.md generator
    -   webapp frontend components that render manual / book pages
    -   database migration scripts (migrations/XXX_add_low_level_flag.sql or TS)
    -   tests/**/* (update or add tests)
    -   changelog/_current-preversion.md
-   Acceptance criteria:
    -   MODEL is removed from /api/docs/book.md output.
    -   Low-level commitments are visible only in a bottom section of the manual and highlighted in the editor but do not appear in autocompletion.
    -   Suggestions only propose primary commitment variants; aliases are not suggested but still present in metadata and visually dimmed where shown.
    -   No runtime behavioral changes to commitment execution aside from presentation and suggestions.

Questions / decisions needed (placeholders marked @@@):
-   Should existing MODEL commitments be migrated to low_level=true automatically? @@@
-   Preferred color / badge text for low-level commitments? @@@
-   Should the low-level section be collapsed by default in the manual and the editor? @@@
-   Confirm the canonical field name to use: `low_level` boolean OR `flags` enum / bitmask? @@@



[🛡️📘] Low-level commitments & alias cleanup

-   Implement a generic flag `low_level` on commitments. Remove MODEL from the `book.md` manual and add a bottom `Low-level commitments` section for commitments with the flag.
-   Remove alias variants from the editor suggestion list; only canonical names are suggested. Keep aliases in metadata and display them in a low-visibility way.

This commit was done by [Promptbook Agent](https://pavol-hejny.ptbk.io/agents/E1upys74QBME7s/)
