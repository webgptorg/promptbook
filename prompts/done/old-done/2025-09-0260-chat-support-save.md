[x]

[✨😅] Allow to download the chat history / transcript from `Chat` component

-   Make functional `<Chat isSaveButtonEnabled`
-   Alongsite the "New Chat" button, add a "Download" button
-   This should show multiple formats to download:
    -   JSON (all metadata, messages, etc)
    -   Plain text (just the messages)
    -   Markdown (formatted messages)
    -   HTML (formatted messages)
-   Each download format should be a "plugin" - do not hardcode the formats somewhere do a system where new formats can be added easily, simmilar to other parts of Promptbook where extensible code is used
-   Make prop `<Chat saveFormats={['json', 'md', 'txt', 'html']}` to configure which formats are available, by default all available formats should be there
-   Add the showcase of the save functionality into `ChatPreview`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[x]

[✨😅] Enhance saving of <Chat/> to markdown format

-   The markdown should serialize the chat messages as closely as possible but still in markdown format _(do not embed raw HTML in markdown)_
-   Add reference to Promptbook with link to https://ptbk.io, ideally somewhere at the end of the markdown file
-   The logic of markdown saving is in [`mdSaveFormatDefinition.ts`](/src/book-components/Chat/save/markdown/mdSaveFormatDefinition.ts)
-   Use `spaceTrim` utility
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[x]

[✨😅] Enhance saving of <Chat/> to html format

-   The HTML should be a full standalone HTML file with simple but visually appealing chat as similar to the chat UI in Promptbook
-   Html should be valid HTML5 standalone page with inline CSS styles and JS if needed
-   Preserve the colors of chat participants
-   Add reference to Promptbook with link to https://ptbk.io, ideally in the footer of the page
-   The logic of html saving is in [`htmlSaveFormatDefinition.ts`](/src/book-components/Chat/save/html/htmlSaveFormatDefinition.ts)
-   Use `spaceTrim` utility
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[x]

[✨😅] Create saving of <Chat/> to pdf format

-   The PDF should take `htmlSaveFormatDefinition` as base and convert the HTML to PDF
-   The logic of pdf saving should be in new file [`pdfSaveFormatDefinition.ts`](/src/book-components/Chat/save/pdf/pdfSaveFormatDefinition.ts)
-   Add to the available formats as `pdf`
-   Use `spaceTrim` utility
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[-]

[✨😅] Create saving of <Chat/> to docx format

-   The DOCX should take `docxSaveFormatDefinition` as base and convert the Markdown or Html to DOCX
-   The logic of docx saving should be in new file [`docxSaveFormatDefinition.ts`](/src/book-components/Chat/save/docx/docxSaveFormatDefinition.ts)
-   Add to the available formats as `docx`
-   Use `spaceTrim` utility
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[-]

[✨😅] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[-]

[✨😅] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[-]

[✨😅] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[-]

[✨😅] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`
