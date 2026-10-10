[x] <- Done but revert later

[✨📶] Make some testing playground for `@promptbook/components`

-   Test it both visually, manually and as unit test
-   As a first tested component should be BookEditor
-   Add everything to terminals.json and build pipeline

---

[x]

[✨📶] Make some testing playground for `@promptbook/components`

-   You should be able to run it in as a server which will render the components
-   Server will run on `localhost:4461`
-   Add this as script to `/.vscode/terminals.json`
-   Server should serve the components from `src/book-components`
-   As a first tested component should be `<BookEditor />`
-   Playground server script should be added to `/scripts` folder
-   Look how other playgrounds are implemented in this project

---

[x]

[✨📶] Playground should show the actual `<BookEditor />`

Playground `/scripts/components-playground-server.ts` should render the `<BookEditor />` component which is located at `/src/book-components/BookEditor/BookEditor.tsx`
Not some inlined version which is hardcoded in the source code of the playground server.

-   Implement some internal transpilation
-   Server should look at current source code of [BookEditor](/src/book-components/BookEditor/BookEditor.tsx) when user refreshed the page, current source code should be used for rendering.
-   Do not implement the hotloading

---

[-]

[✨📶] Playground should show the preview of the `<BookEditor />` and then the source code.
