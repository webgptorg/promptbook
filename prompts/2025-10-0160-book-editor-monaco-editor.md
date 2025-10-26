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

[x]

[✨✧] The `title` token should match only the first line and the entire line of the book

-   The `title` should be both **bold** and _italic_
-   You are working on `src/book-components/BookEditor/BookEditorMonaco.tsx`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[x]

[✨✧] Between each line of the book there should be tiny visible lines, like a notebook page

-   Not the lines are only on the top and bottom of the line with cursor
-   You are working on `src/book-components/BookEditor/BookEditorMonaco.tsx`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[x]

[✨✧] Whisper all the commitment keywords in the `BookEditorMonaco` language definition when typing

-   You are working on `src/book-components/BookEditor/BookEditorMonaco.tsx`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[x]

[✨✧] Commitment can be both lowercase and uppercase, both are the correct keywords

-   For example `PERSONA` and `persona` both work as commitment keywords
-   Do not modify the commitments logic and definitions, modify only the language definition in `BookEditorMonaco`
-   You are working on `src/book-components/BookEditor/BookEditorMonaco.tsx`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[x]

[✨✧] Editor should have interval padding 20px from both left, right and top

-   You are working on `src/book-components/BookEditor/BookEditorMonaco.tsx`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[x]

[✨✧] Parameter should match international characters

_For example:_

```book
Tohle je @Slovník
```

-   Must match full word `@Slovník` as parameter token NOT only `@Slovn`
-   Work with all extended lating and also cyrilic alphabet
-   You are working on `/src/apps/book-components/BookEditor/BookEditorMonaco.tsx`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[x]

[✨✧] In `BookEditor` add extra 5 new lines on bottom

-   Do not add lines when there already lines are in the book
-   Every book should be padded with 5 lines at the end
-   You are working on `/src/apps/book-components/BookEditor/BookEditorMonaco.tsx`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[x]

[✨✧] Book editors should have action bar on top right corner

-   Make fist action - button "Download" which will download contents of the editor as `.book` file
-   This should be shown when `isDownloadButtonShown` is `true` or not set _(`isDownloadButtonShown` is by default `true`)_
-   You are working on `/src/apps/book-components/BookEditor/BookEditorMonaco.tsx`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[x]

[✨✧] `META` token keyword should match 2 words not just one

_For example:_

```book
Asistent pro LŠVP

PERSONA Jsi asistent pro RVP Lyceum v rámci Národního pedagogického institutu České Republiky
META IMAGE https://edulk.cz/getFile/id:475818/type:large/02%20zna%C4%8Dka%20npi.jpg
```

-   Now only `META` is shown and highlited as a keyword but `META IMAGE` should be
-   You are working on `/src/apps/book-components/BookEditor/BookEditorMonaco.tsx`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨✧] bar

-   You are working on `/src/apps/book-components/BookEditor/BookEditorMonaco.tsx`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨✧] bar

-   You are working on `/src/apps/book-components/BookEditor/BookEditorMonaco.tsx`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
