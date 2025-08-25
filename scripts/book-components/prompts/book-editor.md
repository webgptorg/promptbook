[ ]

Add component simmilar to `textarea-with-counter` but without any counter, just a simple textarea with Tailwind styles.

This component should be named `book-editor` `<BookEditor />` and should be used in the playground page instead of the `TextareaWithCounter`.

---

[x]

Enhance component `BookEditor`, it should have design and UI according provided screenshot.

-   Text should be larger with font Libre Baskerville
-   It should look like lined paper
-   Highlighted keywords like "PERSONA", "KNOWLEDGE", "EXAMPLE", etc.
-   To get the highlighted keywords, you can use the `getAllCommitmentDefinitions` `createTypeRegex` from `@promptbook/core`.
-   Make design in Tailwind CSS

![alt text](screenshots/book-editor.png)

---

[x]

In component `BookEditor` cursor is not aligned with the text.

-   This happen only on some lines, for example on "PERSONA A friendly AI assistant that helps you with your tasks"
-   Its probbly because of the highlighted keywords, they are not aligned with the text.
-   The cursor should be aligned with the text both in the keyword and in the rest of the text.

Fix this issue.

---

[x]

In component `BookEditor` lines on background should be in sync and scrolled with text.

---

[x]

In component `BookEditor` lines on background should be always aligned with the text.

-   Be aware of highlighted keywords, they should not affect the alignment of the lines.
-   Be aware of the line wraps
-   It should look like a lined notebook paper design, where the lines are always aligned with the text, even when the text is wrapped or highlighted.

---

[x][ ]

Implement intellisense in `BookEditor` component.

-   Use the `getAllCommitmentDefinitions` from `@promptbook/core` to get the definitions.

---

[ ]

Implement hover on highlited commitment in `BookEditor`

-   It should be part of the intellisense
-   When you hover on the highlighted commitment, it should show the description of the commitment
-   The description are in markdown and should be rendered as HTML
-   Use the `description` and `documentation` from `getAllCommitmentDefinitions` from `@promptbook/core` to get the definitions.

---

[x]

The "Commitment Definitions" in `BookEditorPreview` are messed up, they should be displayed in some better way.

-   Use the `description` and `documentation` from `getAllCommitmentDefinitions`
-   The purpose of this section is to show the manual for `BookEditor`
-   Descriptions are in markdown format, so they should be rendered as HTML
-   You should be able to navigate through the definitions and see the description of each definition

---

[x]

Move the middle vertical line to the left side of the text area in `BookEditor`.

-   It should be 30px from the left side of the left border
-   Text in the text area should be indented by this line
-   On the right side of the text area, there should be the indent but no line
-   It should remind the lined notebook paper design
-   The line should have slight blue color
