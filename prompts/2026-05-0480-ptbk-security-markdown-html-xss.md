[-]

[🔐] Fix XSS in Promptbook markdown rendering and HTML export sanitization

-   Promptbook currently renders user-controlled markdown into HTML and then tries to sanitize that HTML with a few ad-hoc regular expressions before inserting it back into the DOM, which is not a safe XSS defense.
-   Both [`src/book-components/Chat/MarkdownContent/MarkdownContent.tsx`](src/book-components/Chat/MarkdownContent/MarkdownContent.tsx) and [`src/book-components/Chat/utils/renderMarkdown.ts`](src/book-components/Chat/utils/renderMarkdown.ts) remove only a small subset of dangerous constructs such as double-quoted `on*="..."` handlers and simple `javascript:` / `data:` substrings, but they do not provide context-aware HTML sanitization for single-quoted attributes, unquoted attributes, encoded payloads, SVG/MathML edge cases, or future parser quirks.
-   The resulting HTML is then rendered through `dangerouslySetInnerHTML` in [`src/book-components/Chat/MarkdownContent/MarkdownContent.tsx`](src/book-components/Chat/MarkdownContent/MarkdownContent.tsx), and the shared helper in [`src/book-components/Chat/utils/renderMarkdown.ts`](src/book-components/Chat/utils/renderMarkdown.ts) is also used by saved HTML export paths such as [`src/book-components/Chat/save/html/htmlSaveFormatDefinition.ts`](src/book-components/Chat/save/html/htmlSaveFormatDefinition.ts).
-   Because raw HTML is allowed to survive the markdown conversion pipeline, an attacker who controls message content, imported content, or any other markdown rendered through these helpers can target viewers with stored or reflected XSS payloads.
-   Fix this by replacing the regex-based filtering with one shared, battle-tested HTML sanitizer configured with an explicit allowlist, and add regression tests that cover raw HTML, dangerous attributes, URL-based payloads, and export rendering paths.
-   Group both markdown-rendering implementations and all callers of the shared renderer into this one PRD because they are the same root vulnerability.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Promptbook Engine](src)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
