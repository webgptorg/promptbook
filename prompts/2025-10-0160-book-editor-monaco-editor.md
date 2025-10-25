[x]

[✨✧] Reimplement <BookEditor/> using Monaco Editor

-   Use Monaco Editor as the core text editor component inside `<BookEditor />`
-   Ensure syntax highlighting stays the same as before
    -   The first line of the book is bold and underlined
    -   The commitment keywords shouldnt be hardcoded in the language definition, the language definition should be dynamic based on `getAllCommitmentDefinitions()`
    -   Highlighted are also the parameters, the syntax is @parameter or {Multi Word Parameter}
    -   All of theese are already implemented in the current version of `<BookEditor />`, make sure they stay the same or similar
-   Preserve all existing props and functionalities of `<BookEditor />`
-   Preserve the capability of dropping files into the editor to upload them _(preserve the existing props for that)_
-   You dont need to preserve the split between `BookEditor` and `BookEditorInner`, just make sure the public API of `<BookEditor />` component remains unchanged
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨✧] The `title` token should match only the first line and the entire line of the book

-   The `title` should be both **bold** and _italic_
-   You are working on `src/book-components/BookEditor/BookEditorMonaco.tsx`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨✧] Between each line of the book there should be tiny visible lines, like a notebook page

-   Not the lines are only on the top and bottom of the line with cursor
-   You are working on `src/book-components/BookEditor/BookEditorMonaco.tsx`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨✧] Whisper all the commitment keywords in the `BookEditorMonaco` language definition when typing

-   You are working on `src/book-components/BookEditor/BookEditorMonaco.tsx`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨✧] Commitment can be both lowercase and uppercase, both are the correct keywords

-   For example `PERSONA` and `persona` both work as commitment keywords
-   You are working on `src/book-components/BookEditor/BookEditorMonaco.tsx`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨✧] bar

-   You are working on `src/book-components/BookEditor/BookEditorMonaco.tsx`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨✧] bar

-   You are working on `src/book-components/BookEditor/BookEditorMonaco.tsx`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨✧] bar

-   You are working on `src/book-components/BookEditor/BookEditorMonaco.tsx`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
