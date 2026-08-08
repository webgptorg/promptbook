# Section: Comparison

Anchor `#comparison`. The last section before the footer, on the lighter panel background. It answers the one question a visitor who already uses a coding agent has left: _why not just run Claude Code, Codex or opencode directly?_

## Copy

-   **Heading**: `Not another agent — the layer above them` ("the layer above them" in Promptbook Blue).
-   **Lead paragraph**: Claude Code, OpenAI Codex and opencode are agents that ptbk coder drives, so you keep the one you already use. What the table compares is everything _around_ a task — the backlog, the verification, the git hygiene, the pacing — never how well an agent writes code.

## Table

One row per capability and one column per solution, exactly the rows, columns, levels and notes of [`../content/comparison-matrix.md`](../content/comparison-matrix.md).

-   **Head row**: an empty-looking `Capability` label above the first column, then one column head per solution — [logo tile](../content/harness-catalog.md) (the white Promptbook mark on a blue-bordered tile for `ptbk coder`, the harness mark for the others), display name, and `by <vendor>` underneath.
-   **First column** (12rem on phones, 16rem from `sm`, so that one whole solution column fits next to it): capability name (Outfit semibold, white) with its description below (small, gray). It is **sticky** while the table scrolls horizontally, so its background is the opaque page background.
-   **Cells**: the support mark centered, with the note underneath. Notes which are command-line tokens (`--flag`, `ptbk …`) are monospace, the rest is normal text.
-   **`ptbk coder` column** is highlighted along its whole height with a Promptbook Blue Dark tint at 10% and a blue column name.
-   Rows are separated by hairline `gray-800` borders; the table has a minimum width of 52rem and scrolls horizontally below that. The layout is fixed, so all four solution columns are equally wide and the first one is fully readable next to the sticky column even on a 360px phone.

## Legend

Below the table, one line per support level with its mark and the legend text from the matrix spec — the same mark component as in the cells. Each mark also carries a screen-reader-only label, because the level is otherwise conveyed by shape and color only.

## Footnote

Below the legend, small muted text: "Inside a single task nothing changes: ptbk coder runs your harness exactly as it is, with its own tools, its own sandbox and its own MCP servers. Every capability in the table is explained in detail among the **features above**." — where "features above" links to `#features`, so no capability is explained twice.
