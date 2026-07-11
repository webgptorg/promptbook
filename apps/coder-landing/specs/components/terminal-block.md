# Component: Terminal block

Every static shell sample on the page is rendered by one shared **terminal block** component. It must *look like a terminal* and be *copyable*.

Used by: [Hero](../sections/hero.md), [Quickstart](../sections/quickstart.md), [Agent personas](../sections/agent-book.md), [Harnesses](../sections/harnesses.md), [Advanced features](../sections/advanced-features.md).

## Inputs

| Prop      | Meaning                                                        | Default  |
| --------- | -------------------------------------------------------------- | -------- |
| `command` | The shell command; multiple commands separated by newlines     | required |
| `title`   | Text in the window title bar                                   | `bash`   |

## Appearance

-   A window frame: rounded ~0.75rem, 1px `gray-700` border, background `#0d1117`, large soft black shadow.
-   Title bar: background `#161b22`, bottom hairline, three macOS traffic-light dots (`#ff5f57`, `#febc2e`, `#28c840`, decorative/`aria-hidden`), then the `title` in small gray monospace, then the **Copy** button aligned right.
-   Body: monospace (JetBrains Mono), ~0.875rem, relaxed line height, 1rem padding; horizontal overflow scrolls; long single commands soft-wrap (`pre-wrap` + `break-words`).
-   Each command line is prefixed with a gray, **non-selectable** `$ ` prompt (so copy-pasting rendered text never includes `$`).

## Copy behavior

-   The Copy button writes the **raw `command` string** (no `$ ` prefixes, no highlighting artifacts) to the clipboard via the async Clipboard API.
-   After copying, the button label changes to `✔ Copied!` for 2 seconds, then reverts to `Copy`.
-   The button has `aria-label="Copy command to clipboard"`.

## Syntax highlighting

Minimal bash highlighting, tokenized per whitespace-separated token (quoted segments kept together):

| Token kind                                  | Rule                                                | Color                        |
| ------------------------------------------- | ---------------------------------------------------- | ---------------------------- |
| Comment                                     | Line starts with `#` → whole line                    | gray, italic                 |
| Command                                     | First non-flag, non-env token of the line            | Promptbook Green `#7AFFEB`   |
| Subcommand                                  | Non-flag tokens before the first flag                | Promptbook Blue `#7AEBFF`    |
| Flag                                        | Token starting with `-`                              | light sky blue               |
| Quoted string                               | Token wrapped in `"` or `'`                          | amber                        |
| Environment variable assignment             | `UPPER_SNAKE_CASE=` prefix                           | fuchsia                      |
| Everything else (values, paths, arguments)  | —                                                    | near-white gray              |
