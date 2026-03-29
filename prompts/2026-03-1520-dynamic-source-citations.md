[ ]

[🧾📎] Render agent citations as clean numbered footnotes (dedup per document)

-   The agent in the Agents Server can cite sources, but the current citations render as ugly blue technical markers inside the message text (e.g. patterns like `[0:0]` and `[8:13]`).
-   Transform the chat rendering so that message body contains only clean numeric citation markers (e.g. `¹`, `²`), and at the bottom of the same message a footnote list appears with:
    -   the same number in front of the cited source
    -   the source name rendered as the citation chip *(same as now)*
-   Citation numbering rules:
    -   Two possible incoming cite notations must be supported: `[0:0]` and `[8:13]`.
    -   The chat component must generate the displayed citation numbers dynamically.
    -   If the same document is cited multiple times within a message, the same number must be repeated (deduplicate by document).
    -   Ordering should be stable and predictable: first appearance in the message defines the number.
-   Implementation constraints:
    -   Do not change the underlying model output semantics; only transform/format citations during rendering in the chat UI.
    -   The transformation must be applied both for streamed tokens and for fully-rendered messages (no flicker / number changes after finalization).
    -   Preserve existing Markdown formatting in messages (bold/italic/code blocks).
-   Update/locate the relevant code:
    -   You are working with the [Agents Server](apps/agents-server)
    -   Identify where the chat bubble renders message text and where citations are currently parsed/rendered.
    -   Add or adjust a utility that parses the incoming cite tokens (`[x:y]`) and maps them to document identifiers.
    -   Add a renderer that produces:
        -   message text with inline numeric markers
        -   a bottom footnote block listing `number -> 【document123.doc】`
-   Add tests:
    -   Unit tests for parsing `[0:0]` and `[8:13]` cite tokens and deduplicating by document.
    -   Unit tests for stable numbering order by first appearance.
    -   One integration/unit test for rendering of a chat message containing multiple citations across the same doc.
-   Acceptance criteria (manual):
    -   When citing the same document multiple times, the number repeats and a single footnote is shown.
    -   The raw blue technical braces disappear from visible chat text.
    -   Footnotes appear at the bottom of the message, clearly associated with the body citations.
-   Acceptance criteria (automated):
    -   Tests covering `[0:0]` + `[8:13]` notations and dedup behavior pass.
