[x]

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

[x]

[✨🥰] Update file uploading in `<BookEditor>`

Now the `onFileUpload` are inserted where the last cursor position is
We want to insert it where the file was dropped and select the inserted text

---

[x]

[✨🥰] Update file uploading drop point `<BookEditor>`

Now the `onFileUpload` are inserted where the file(s) was dropped.

It working perfectly accept one case:
When the file is dropped bellow the end of the text, the string is not placed on the line where the file was dropped, but at the end of the text. Which can be several lines below the drop point.

When user drops the file below the text, we want to insert newlines such as the cursor is placed exactly on the row where the file was dropped.

---

[x]

[✨🥰] Make file uploading in `<BookEditor>` smarter

**1. Imagine the situation that the text in the editor is and user drops a file here ✖ (somewhere in the middle of the text):**

```
Foo

Foo ✖
```

1.a. When the return of every `onFileUpload` is a single line, insert just the returned text at the drop point separated by spaces, e.g. `foo bar baz`
1.b. When the return of at least one `onFileUpload` is multiline just behave like (2) below.

**2. Imagine the situation that the text in the editor is and user drops a file here ✖ (at the start of a new line):**

```
Foo

Foo

✖
```

Go through each result of `onFileUpload` and inset it accordingly:

```
Foo

Foo

KNOWLEDGE singleline1
KNOWLEDGE singleline2
KNOWLEDGE
mult
il
ine3
KNOWLEDGE singleline4

```

Make this entire logic work in some nice way in the code, with good comments and self-explanatory code structure, separete into functions if needed woth prefix `smartInsert...`

---

[ ]

[✨🥰] quux
