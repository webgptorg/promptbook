[🛡️🧹] Low-level commitments & alias cleanup

-   *(@@@@ Written by agent)*

Overview: Create a generic "low-level" flag for commitments (decoupled from MODEL), remove MODEL from the main book/manual output (/api/docs/book.md), surface low-level commitments in a distinct bottom section of the manual and editor (with special styling), highlight them in the editor but exclude them from autocompletion suggestions, and remove alias variants from suggestion lists while keeping aliases in metadata for backward compatibility.

-   Add a new generic commitment flag `low_level` (boolean) or a `flags` bitmask enum on the Commitment/AgentCommitment model. This must be decoupled from the MODEL commitment and usable for other commitments in the future. @@@
-   Data migration: decide whether existing MODEL commitments should be marked `low_level=true` automatically. @@@
-   API / docs generator: modify /api/docs/book.md generation to exclude commitments with `low_level=true`. Low-level commitments must not be included in book.md (they will be included in a separate `Low-level commitments` section in the manual UI only).
-   Manual: display low-level commitments in a special bottom section titled `Low-level commitments` with a distinct color or tag. They should be visually separated from the main manual content and marked as non-recommended for inclusion. Provide product design guidance for exact color/badge. @@@
-   Book editor:
    -   Highlight low-level commitments visually (color / badge) in the editor UI.
    -   Show them in a special bottom section or collapsed area in the editor `Commitments` panel labelled "Low-level commitments".
    -   Do NOT include low-level commitments in autocompletion suggestions while typing commitments.
    -   Provide a per-commitment toggle in the editor to mark/unmark `low_level`.
    -   Low-level section can be collapsed by default — decision needed. @@@
-   Autocomplete / Suggestions:
    -   Remove alias variants (e.g., RULES, RULE) from the suggestion list — only suggest the primary canonical commitment token.
    -   Still render aliases visually where they exist (for example as dimmed secondary text / tooltip), but they must not appear in the prefix-matching suggestions.
    -   Aliases should be lower-visibility across the UI (docs, suggestion hints), and must NOT be included in /api/docs/book.md.
-   Search & indexing: update any server-side suggestion index to store commitments by their canonical primary variant only for suggestion purposes, while retaining aliases in metadata for backward compatibility and highlighting.
-   Storage & model changes:
    -   Add columns / schema migration for `low_level` flag and normalize aliases storage to a single canonical name + aliases array in JSONB.
    -   Ensure existing code paths that look up commitments by alias still resolve to the canonical commitment when executing rules, but aliases are not surfaced in editor suggestions.
-   UI/UX details required from product:
    -   Exact color / badge style for low-level items. @@@
    -   Where to show the "Low-level commitments" section in the manual and editor (collapsed by default? pinned to bottom?). @@@
    -   Decide automatic migration policy for MODEL. @@@
    -   Confirm the canonical field name to use: `low_level` boolean OR `flags` enum / bitmask? @@@
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
    -   tests/**/*
    -   changelog/_current-preversion.md
-   Acceptance criteria:
    -   MODEL is removed from /api/docs/book.md output.
    -   Low-level commitments are visible only in a bottom section of the manual and highlighted in the editor but do not appear in autocompletion.
    -   Suggestions only propose primary commitment variants; aliases are not suggested but still present in metadata and visually dimmed where shown.
    -   No runtime behavioral changes to commitment execution aside from presentation and suggestions.
-   Implementation plan (suggested):
    1. Add DB migration + model changes (add `low_level` or `flags` and normalize aliases storage).
    2. Update suggestion indexing and autocomplete backend to only index canonical tokens.
    3. Update book.md generator to filter low_level commitments.
    4. Update editor UI (highlighting, special section, toggle control, suggestion behavior).
    5. Tests, changelog, and rollout (migrate existing MODEL commits based on decision).

-   Link to the initial PRD commit for reference: https://github.com/webgptorg/promptbook/commit/e531544f4df7853dac0f9c093d115125cdc7b480

-   Please answer the placeholders marked @@@ so I can update this PRD and produce an implementation checklist + tasks.

This commit was done by [Promptbook Agent](https://pavol-hejny.ptbk.io/agents/E1upys74QBME7s/)
