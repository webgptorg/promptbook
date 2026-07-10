# Page structure

The landing page is a **single page** (route `/`) composed of the following blocks, in this exact order.

| # | Block                                                            | Anchor id       |
| - | ---------------------------------------------------------------- | --------------- |
| 1 | [Header](./sections/header.md) (sticky)                          | —               |
| 2 | [Hero](./sections/hero.md)                                       | —               |
| 3 | [What is ptbk coder](./sections/what-is-ptbk-coder.md)           | `how-it-works`  |
| 4 | [Quickstart](./sections/quickstart.md)                           | `quickstart`    |
| 5 | [Agent personas / Book](./sections/agent-book.md)                | `agents`        |
| 6 | [Harnesses & models](./sections/harnesses.md)                    | `harnesses`     |
| 7 | [Advanced features](./sections/advanced-features.md)             | `features`      |
| 8 | [Footer](./sections/footer.md)                                   | —               |

## Rules

-   Sections 3–7 are `<section>` elements with the anchor ids above; the header navigation links to them with `#anchor` fragment links (see [`sections/header.md`](./sections/header.md)).
-   Anchor targets must account for the sticky header height (e.g. `scroll-margin-top` ≈ 5rem) and the page scrolls smoothly (`scroll-behavior: smooth`).
-   Content is horizontally centered with a max width of ~72rem (`max-w-6xl`) and 1rem horizontal padding.
-   Sections alternate visual rhythm: Quickstart and Harnesses sit on a slightly lighter panel background (`gray-900/30` between hairline borders); the others sit on the page background (see [`design.md`](./design.md)).
-   Vertical padding of each section is ~5rem.

## Narrative arc

The order is intentional and mirrors the visitor journey defined in [`product.md`](./product.md):

1. **Hook** (hero: value proposition + live proof) →
2. **Understanding** (how it works, for people who know Claude Code/Codex) →
3. **Action** (quickstart from install to server) →
4. **Depth** (personas, harness choice, advanced features) →
5. **Trust** (footer: part of Promptbook).
