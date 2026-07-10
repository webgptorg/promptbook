# Design

The page follows the official [Promptbook branding](https://www.ptbk.io/branding).

## Mode & language

-   **Dark mode only.** There is no light theme and no theme switcher. `color-scheme: dark` is declared on the root.
-   **English only.**

## Colors

| Token                  | Value     | Usage                                                            |
| ---------------------- | --------- | ---------------------------------------------------------------- |
| Promptbook Blue        | `#7AEBFF` | Primary accent: links hover, highlights, primary CTA background  |
| Promptbook Blue Dark   | `#30A8BD` | Muted accent: borders, glows, underlines                         |
| Promptbook Green       | `#7AFFEB` | Secondary accent: success lines in terminals, CTA hover          |
| Promptbook Green Dark  | `#30BDA8` | Muted secondary accent                                           |
| Dark Gray              | `#111827` | Page background                                                  |
| Light Gray             | `#F3F4F6` | Base foreground text                                             |

Supporting neutrals come from the Tailwind gray scale (gray-950 … gray-300): terminal backgrounds `#0d1117`, terminal title bars `#161b22`, card backgrounds `gray-900` at 50–60% opacity, hairline borders `gray-800`, secondary text `gray-300`/`gray-400`, muted text `gray-500`.

Gradient accents combine Promptbook Blue → Promptbook Green (e.g. gradient text in the hero headline, see [`sections/hero.md`](./sections/hero.md)).

## Typography

Per the Promptbook brand kit — two fonts with distinct roles, plus a monospace for terminals:

| Font              | Role                                                             |
| ----------------- | ---------------------------------------------------------------- |
| **Outfit**        | Headlines, section titles, high-visibility statements, wordmark  |
| **Inter**         | Body copy, interface text, labels                                |
| **JetBrains Mono**| Everything terminal-like: commands, code, `--flags` inline       |

All fonts are loaded as latin subsets with weights 400–700 (mono: 400, 500, 700) and exposed as CSS variables.

## Logo

-   The **white transparent Promptbook mark** (`promptbook-logo-white-transparent-1024.png` from the brand kit) is used in the header and footer, because the page background is dark ("use the white mark on dark UIs").
-   The mark must not be stretched, recolored, rotated or given effects.

## Layout & responsiveness

-   Mobile-first; the page must be fully usable from ~360px wide phones to desktop.
-   Content max width ~72rem, centered, 1rem side padding.
-   Grids collapse to a single column on small screens (hero 2→1, harness cards 2→1, feature cards 3→2→1, footer 4→2→1).
-   The header collapses its navigation into a hamburger menu below the `md` breakpoint (see [`sections/header.md`](./sections/header.md)).
-   Terminal blocks scroll horizontally rather than break the layout; long commands may soft-wrap (see [`components/terminal-block.md`](./components/terminal-block.md)).

## Feel

-   Terminal-first aesthetic: the most prominent visual objects on the page are terminal windows (see [`components/terminal-block.md`](./components/terminal-block.md) and [`components/live-terminal.md`](./components/live-terminal.md)).
-   Rounded corners (~0.75rem), soft large shadows on terminals, subtle hover transitions (~150ms) on cards, links and buttons.
-   A soft blue gradient glow sits behind the hero.
-   Focus-visible outlines in Promptbook Blue for keyboard users.
