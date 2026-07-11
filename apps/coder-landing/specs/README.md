# ptbk coder landing page — Specs

This folder is the **single source of truth** for the functionality of the `ptbk coder` landing page.

The specs serve three purposes:

1. **Development** — every component and section of the page is implemented against a spec here.
2. **Testing & documentation** — behavior described here is the expected behavior of the page.
3. **1:1 replication** — taking only this `specs/` folder, it must be possible to re-implement the page with identical functionality and content, without ever seeing the source code.

## How the specs are organized

-   The **most important and most abstract** specs live in the root of `specs/`.
-   Less important, more concrete specs live in subfolders.
-   One markdown file = one spec = one responsibility / aspect of the page.
-   Specs are interlinked with relative markdown hyperlinks; follow the links to drill down.

## Core specs (root)

| Spec                                       | Responsibility                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| [`product.md`](./product.md)               | What `ptbk coder` is and the story the page must tell                     |
| [`page-structure.md`](./page-structure.md) | Order, anchors and layout of all page sections                            |
| [`design.md`](./design.md)                 | Branding, colors, typography, dark mode, responsiveness                   |
| [`non-functional.md`](./non-functional.md) | Technology, port, accessibility and quality requirements                  |

## Content specs ([`content/`](./content/))

Canonical data rendered by the page — commands, harness catalog, agent source. These exist so the same values are never duplicated (DRY).

-   [`content/commands.md`](./content/commands.md)
-   [`content/harness-catalog.md`](./content/harness-catalog.md)
-   [`content/developer-agent.md`](./content/developer-agent.md)

## Component specs ([`components/`](./components/))

Reusable building blocks:

-   [`components/terminal-block.md`](./components/terminal-block.md)
-   [`components/live-terminal.md`](./components/live-terminal.md)
-   [`components/book-editor-embed.md`](./components/book-editor-embed.md)

## Section specs ([`sections/`](./sections/))

Top-to-bottom, in page order (see [`page-structure.md`](./page-structure.md)):

-   [`sections/header.md`](./sections/header.md)
-   [`sections/hero.md`](./sections/hero.md)
-   [`sections/what-is-ptbk-coder.md`](./sections/what-is-ptbk-coder.md)
-   [`sections/quickstart.md`](./sections/quickstart.md)
-   [`sections/agent-book.md`](./sections/agent-book.md)
-   [`sections/harnesses.md`](./sections/harnesses.md)
-   [`sections/advanced-features.md`](./sections/advanced-features.md)
-   [`sections/footer.md`](./sections/footer.md)

## Rules for maintaining specs

-   When the page changes, the corresponding spec **must** change in the same commit — and vice versa.
-   Keep canonical values (commands, colors, links, catalog entries) only in **one** spec and link to it from others.
