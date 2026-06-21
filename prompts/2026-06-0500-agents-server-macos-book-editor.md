[x] $2.48 40 minutes by Claude Code

[✨✏️] Create a simple app for MacOS that allows to edit the `.book` files

-   The app should be a simple editor for the `.book` files, with syntax highlighting and basic editing capabilities.
-   Keep in mind the DRY _(don't repeat yourself)_ principle, re-use the existing code and components, share the code as much as possible
-   The app should be implemented in `apps/book-editor-macos` folder
-   Do a proper analysis of the current functionality before you start implementing.
-   Use the [`<BookEditor/>` component](src/book-components/BookEditor/BookEditor.tsx)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[ ] !

[✨✏️] Add script(s) to automate the build and publishing of the MacOS app

-   In `apps/book-editor-macos` there is a simple MacOS app that allows to edit the `.book` files
-   Add the publishing of this app into `package.json` script as `build:book-editor-macos` and link it to [`terminals.json`](.vscode/terminals.json)
-   Also create a Github Action workflow to build and publish the app on every version release
-   If there is some things which I need to do as a user, create [file with the instructions](agents-messages/2026-06-0500-agents-server-macos-book-editor.message.md)
-   Do a proper analysis of the current functionality before you start implementing.
-   Keep in mind the DRY _(don't repeat yourself)_ principle
