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

[ ]

[✨😅] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨😅] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨😅] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`
