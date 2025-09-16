[ ]

[✨🥰] Implement `<BookEditor onFileUpload={...} />`

```typescript
export type BookEditorProps = {
    // ...

    /**
     * returns the URL of the uploaded file on CDN or storage
     */
    onFileUpload?(file: File): Promise<string_url>;

    // ...
};
```

-   This is callback prop that is called when user drops files into the book editor.
-   The function will return the URL of the uploaded file on CDN or storage.
-   This url is placed into the text content at the current cursor position.
-   When user drop multiple files, this function is called multiple times, once per each file, the function should be called in parallel.
-   You can look for inspiration on [AgentBookEditor.tsx](C:\Users\me\work\webgptorg\promptbook-studio\src\modals_common\agent-components\AgentBookEditor.tsx)

For example, dummy implementation could be:

```typescript
return <BookEditor onFileUpload={async (file) => `foo`} />;
```

<- Which inserts "foo" at the cursor position when user drops a file, multiple times for multiple files separated by spaces.

---

[ ]

[✨🥰] quux

---

[ ]

[✨🥰] quux

---

[ ]

[✨🥰] quux
