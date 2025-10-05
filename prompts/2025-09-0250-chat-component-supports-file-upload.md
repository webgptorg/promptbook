[ ]

[✨💵] `<Chat>` component should support file uploads

-   User should be able to drop files as an attachment to the message
-   `<Chat onFileUpload={...} />` which should recieve file and return a text which is inserted into the chat input
-   When multiple files are dropped, the `onFileUpload` should be called for each file separately
-   When the `onFileUpload` is not provided, the file upload functionality should be disabled
-   Work both via drag-n-drop and via a button in the chat input area alongside the "send" and "voice call" button
-   When the file is uploaded, show a small preview of the file (filename, size, icon) in the chat input area, with an option to remove the file before sending the message
-   Also append the result of `onFileUpload` to the message when the message is sent
-   Get inspiration from `<BookEditor onFileUpload={...} />`
-   I should be able to test this feature in:
    - http://localhost:4022/component/chat
    - http://localhost:4022/component/llm-chat
-   Keep in mind the DRY _(don't repeat yourself)_ principle, especially with `<BookEditor onFileUpload={...} />`
-   Add the changes into the `CHANGELOG.md`

```typescript
<Chat
    onFileUpload={(file) => {
        // Some possible file handling logic here
        return `[${file.name}]`;
    }}
/>
```

---

[ ]

[✨💵] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨💵] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨💵] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`
