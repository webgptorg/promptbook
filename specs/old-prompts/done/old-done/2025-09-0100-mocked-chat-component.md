[x]

[✨☯️] Create component `MockedChat`

This should show the same chat as `<Chat/>` but emulate ongoing discussion

-   Use internally `<Chat/>`
-   The props should be `type MockedChat = ChatProps & { /* Optional delays configuration */ }`
-   There are several distinct types of delays
    -   Before the first message
    -   Emulated thinking between messages
    -   Wait after written word _(split the messages to words)_
    -   Wait after written word _(it extra delay on top of the word waiting)_
-   Take inspiration from other components here `/src/book-components/`
    -   Especially `/src/book-components/AvatarProfile/AvatarChip/AvatarChip.tsx`
-   Put in under `/src/book-components/AvatarProfile/AvatarProfile`
-   Do not need to make `.module.css` file - internally its just `Chat`
-   Make preview component
    -   Look at folder `/book-components/src/components`
    -   The `component.json` should look like other `component.json`s
    -   Look how other previews are made
        -   Make a preview component
        -   Also a `component.json` file
        -   Register it in `/book-components/src/components/ComponentPreview.tsx`
-   Use `await forTime` function from `waitasecond` package
-   Keep in mind DRY (Don't Repeat Yourself) principle

---

[-]

[✨☯️] foo

---

[-]

[✨☯️] foo

---

[-]

[✨☯️] foo
