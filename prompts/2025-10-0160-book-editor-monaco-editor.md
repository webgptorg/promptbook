[ ]

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

[✨✧] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨✧] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨✧] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`
