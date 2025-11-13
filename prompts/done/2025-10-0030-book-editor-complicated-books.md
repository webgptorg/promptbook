[x] _<- Note: Not working well_

[✨𓀆] Enhance `BookEditor` with large books

-   For big and complicated books, the current implementation of `<BookEditor>` component may struggle with highlighting and rendering performance
-   The highlighting is out of sync with the text when the book is large
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[.] _<- Not working; tryied multiple variations and modifications_

[✨𓀆] /deep-planning Change `BookEditor` highlighting

-   Book editor highlighting is now done by using textarea together with an overlay div
-   This approach improves renders complicated books out of sync with the text
-   Change the logic to `contenteditable` approach
-   User will still edit the text but the text will be auto-highlighted in place
-   Props of the component should remain the same, **highlighting logic should be the same**
-   Visually there should be no difference
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨𓀆] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨𓀆] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`
