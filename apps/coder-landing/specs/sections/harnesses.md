# Section: Harnesses & models

Anchor `#harnesses`. Sits on the lighter panel background. Lists every coding agent (**harness**) `ptbk coder` can drive, as cards.

## Copy

-   **Heading**: `Bring the agent you already use` ("you already use" in Promptbook Blue).
-   **Lead paragraph**: ptbk coder does not replace your coding agent. It drives it. Pick a harness with `--harness` and it automatically selects the current flagship model. Override it with `--model` or `PTBK_MODEL`, and for the harnesses that support it set `--thinking-level` (low, medium, high, xhigh, max).

## Cards

2-column grid on desktop, 1 column on mobile. One card per harness, exactly the entries and order of [`../content/harness-catalog.md`](../content/harness-catalog.md).

Each card contains:

1. **Logo tile** — the harness mark in its accent color (see the Logos rules in the catalog spec).
2. **Display name** (Outfit semibold) and `by <vendor>` underneath.
3. **Harness chip** (top right, ≥ `sm` only): `--harness <id>` in a small monospace chip.
4. **Description** — verbatim from the catalog spec.
5. **Models lines** — `Default: <automatic flagship>` followed by `Models: <examples>`, with model ids in monospace. The default comes from the same registry as CLI execution.
6. **Shell sample** — a [terminal block](../components/terminal-block.md) with the card's sample command from the catalog spec.

Cards have a dark card background, hairline border that lightens on hover.
