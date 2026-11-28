[x]

[✨🐛] When showing `book` code in <Chat/> component, use syntax via `<BookEditor/>`

**In chat message, there can be embedded books, for example:**

```book
Jack Green

RULE Always speak in modern English.
CONTEXT You are helping users of abc.com
```

-   When showing such books in <Chat/> component, do not use monaco editor, but use <BookEditor/> component for better readability
-   Use <BookEditor/> in read-only mode for showing the code snippets
-   For other languages like python, javascript, etc. still use monaco editor with syntax highlighting
-   <Chat/> component is [located in this file](/src/book-components/Chat/Chat/Chat.tsx)
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[x]

[✨🐛] Allow to download book file embeddded in chat message in <Chat/> component

**In chat message, there can be embedded books, for example:**

```book
Jack Green

RULE Always speak in modern English.
CONTEXT You are helping users of abc.com
```

-   This is using <BookEditor/> component to show the book
-   Alongside the embedded book, there should be a download button to download the book as
-   <Chat/> component is [located in this file](/src/book-components/Chat/Chat/Chat.tsx)
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[.] _<- Note: Already done_

[✨🐛] Use <BookEditor/> in `/docs/...`

-   Documentation pages in `/docs/...` can have embedded `book` code snippets
-   When showing such `book` code snippets in documentation pages, use <BookEditor/> in read-only mode
-   Keep in mind the DRY _(don't repeat yourself)_ principle, especially reuse the code from <Chat/> when rendering books inside messages if possible
-   Add the changes into the `/changelog/_current-preversion.md`

---

[x]

[✨🐛] Allow to create instant agent from <Chat/> component

-   When showing embedded `book` in a chat message in <Chat/> component, alongside the download and copy button, also show a "Create agent" button to instantly create an agent from the book
-   <Chat/> component is [located in this file](/src/book-components/Chat/Chat/Chat.tsx)
-   You are working with the `Agents Server` application `/apps/agents-server`
    -   <Chat/> component can work also outside of Agents Server, but this feature is only relevant for Agents Server
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🐛] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`
