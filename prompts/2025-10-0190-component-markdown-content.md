[ ]

[✨🪟] Make component `MarkdownContent`

-   The markdown rendering functionality is already implemented in this project, its just coupled with Chat component
-   The logic should be:
    1. `Chat` component is internaly using `MarkdownContent` component to render markdown
    2. `MarkdownContent` component is internaly using `renderMarkdown` funtion to do the actual rendering
-   Add into `MarkdownContent` JSDoc: @public exported from `@promptbook/components`
-   There are some functionalities which should stay in the `Chat` logic
    -   Feedback buttons
    -   Message status (like typing indicator, error state, etc)
    -   Chat specific stylings (like chat bubble, avatar, etc)
    -   Copy to clipboard button for entire message
    -   Quick reply buttons
-   There are also functionalities which should be moved to `MarkdownContent` component
    -   Render markdown content
    -   Render images, including image upload state
    -   Render tables
    -   Render tool output blocks
    -   Render code blocks with copy button and language label
    -   Render headings, bold, italics, lists, links, etc
    -   Render math `katex`
    -   Styling for all of the above
-   The `Chat` component should stay same in terms of public API and props, design and functionality, just the markdown rendering part is moved to `MarkdownContent` component
-   The `Chat` component is in `/src/book-components/Chat/Chat/Chat.tsx`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨🪟] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨🪟] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨🪟] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`
