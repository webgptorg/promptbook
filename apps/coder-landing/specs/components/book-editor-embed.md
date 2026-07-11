# Component: Readonly Book editor embed

The [Agent personas section](../sections/agent-book.md) embeds the real `<BookEditor/>` component from the Promptbook component library (`@promptbook/components`) to display the default developer agent.

## Configuration

| Aspect     | Value                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------- |
| Content    | The verbatim agent source from [`../content/developer-agent.md`](../content/developer-agent.md)  |
| Mode       | **Readonly** (`isReadonly`) — visitors cannot edit                                                |
| Theme      | Host theme `DARK`; the editor surface itself intentionally renders as light "paper" (that is the product's design: book sources look like paper in both light and dark apps) |
| Height     | Fixed per breakpoint so the whole agent source fits without inner scrolling (the book text wraps more on narrow screens): ~1450px below the `sm` breakpoint, ~1100px above it |
| Buttons    | All editor toolbar buttons (upload, camera, download, about, fullscreen) hidden                   |
| Readonly notice | When a visitor attempts to edit, the editor shows: *"This is a preview of agents/developer.book — run `ptbk coder init` to get your own editable copy."* |

## Why the real component

Using the real `<BookEditor/>` (with Book language syntax highlighting) instead of a static code block demonstrates the actual authoring experience of the Book language. If replicating the page without access to the Promptbook component library, an acceptable fallback is a static, syntax-highlighted rendering of the same source where commitment keywords (`META`, `RULE`, …) are visually distinct — but the content and the readonly behavior must match this spec.
