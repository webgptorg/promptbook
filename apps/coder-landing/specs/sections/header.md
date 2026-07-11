# Section: Header

Sticky page header, always visible at the top (z-index above all content), with backdrop blur and a hairline bottom border over the page background at ~80% opacity.

## Content (left to right)

1. **Brand**: the white Promptbook mark (32px, see [`../design.md`](../design.md)) + wordmark `ptbk coder` — "ptbk" in white, "coder" in Promptbook Blue, Outfit semibold. Links to `/`.
2. **Anchor navigation** (desktop only, ≥ `md`): text links, gray → Promptbook Blue on hover:

    | Label        | Target          |
    | ------------ | --------------- |
    | How it works | `#how-it-works` |
    | Quickstart   | `#quickstart`   |
    | Agents       | `#agents`       |
    | Harnesses    | `#harnesses`    |
    | Features     | `#features`     |

3. **Actions** (desktop only): outlined `GitHub` button → https://github.com/webgptorg/promptbook, and a filled primary `Get started` button (Promptbook Blue background, dark text, green on hover) → `#quickstart`.

## Mobile (< `md`)

-   Navigation and action buttons are hidden; a bordered **hamburger button** appears on the right.
-   Tapping it toggles a vertical menu below the header bar with the same five anchor links plus `GitHub`; the icon switches between hamburger and ✕, `aria-expanded` reflects state, and choosing a link closes the menu.
