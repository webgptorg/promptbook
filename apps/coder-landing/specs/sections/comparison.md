# Section: Comparison

Anchor `#comparison`. The last section before the footer, on the lighter panel background. It answers the one question a visitor who already uses a coding agent has left: _why not just run Claude Code, Codex or opencode directly?_

## Copy

-   **Heading**: `Not another agent. The layer above them.` (the second sentence in Promptbook Blue).
-   **Lead paragraph**: Claude Code, OpenAI Codex and opencode are agents that ptbk coder drives, so you keep the one you already use. The table is not about who writes better code. It compares what happens _around_ a task: whether the queue runs unattended, whether the agent definition moves to another vendor, and whether git history keeps the code and its done state together. Where all three behave the same, the table says so once instead of three times.

## Table

One row per capability and one column per solution, exactly the rows, columns, levels and notes of [`../content/comparison-matrix.md`](../content/comparison-matrix.md).

-   **Head row**: an empty-looking `Capability` label above the first column, then one column head per solution — [logo tile](../content/harness-catalog.md) (the white Promptbook mark on a blue-bordered tile for `ptbk coder`, the harness mark for the others), display name, and `by <vendor>` underneath.
-   **First column** (12rem on phones, 16rem from `sm`, so that one whole solution column fits next to it): capability name (Outfit semibold, white) with its description below (small, gray). It is **sticky** while the table scrolls horizontally, so its background is the opaque page background.
-   **Cells**: the support mark centered, with the note underneath. Notes which are command-line tokens (`--flag`, `ptbk …`) are monospace, the rest is normal text. A note longer than its column breaks inside the word rather than spilling over the neighbouring column.
-   **Merged cells**: neighbouring harness columns whose level _and_ note are identical are drawn as **one cell spanning all of them**, so a claim shared by all three agents is stated once. The `ptbk coder` column always stands on its own, because it is what the table is about. Consequence: most rows show two cells (`ptbk coder` and all three agents), and a row where the agents really differ visibly breaks that rhythm — which is the point.
-   **`ptbk coder` column** is highlighted along its whole height with a Promptbook Blue Dark tint at 10% and a blue column name.
-   Rows are separated by hairline `gray-800` borders and each solution column starts with a hairline `gray-800/60` divider, so the width of a merged cell shows at a glance how many agents it covers. The table has a minimum width of 52rem and scrolls horizontally below that. The layout is fixed, so all four solution columns are equally wide and the first one is fully readable next to the sticky column even on a 360px phone.

## Legend

Below the table, one line per support level with its mark and the legend text from the matrix spec — the same mark component as in the cells. Each mark also carries a screen-reader-only label, because the level is otherwise conveyed by shape and color only.

## Footnote

Below the legend, small muted text: "Inside a single task nothing changes. ptbk coder runs your harness as it is, with its own tools, its own sandbox and its own MCP servers. The **features above** explain every capability in this table in detail." — where "features above" links to `#features`, so no capability is explained twice.
