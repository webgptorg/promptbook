[x] $2.27 38 minutes by Claude Code

[✨🔄] Create a VSCode extension for book language

-   Extension should provide syntax highlighting simmilar to `BookEditor` for the book language.
-   Book language is defined in the `src/book-2.0` folder.
-   Make it to `apps/vscode-extension`
-   Publishing of the extension to the Visual Studio Code marketplace should be automated inside [GitHub Actions workflow](.github/workflows/publish.yml)
-   The extension should be dynamically generated from the commitments.
-   Publishing should be completely automatic.
-   Keep in mind the DRY _(don't repeat yourself)_ principle, try to reuse as much code as possible (for example with <BookEditor/>). When you are generating some code, mark the generated code in standard way as it is in the repository, so it can be easily identified in the future.
-   Look at `C:/Users/me/work/ai/book-extension/` - this is the old version of the extension, it can be used as a reference but do not copy-paste code from it, just use it as a reference for the functionality and automatic deployment to the marketplace, but the code should be implemented from scratch and should be properly integrated with the rest of the repository and use existing components and functions from the repository when possible.
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[ ] !

[✨🔄] Add script(s) to automate the build and publishing of the VSCode extension

-   In `apps/vscode-extension` there is a simple VSCode extension that provides syntax highlighting for the book language
-   Add the publishing of this extension into `package.json` script as `build:vscode-extension` and link it to [`terminals.json`](.vscode/terminals.json)
-   Also create a Github Action workflow to build and publish the extension on every version release
-   If there is some things which I need to do as a user, create [file with the instructions](agents-messages/2026-06-0501-book-vscode-extension.message.md)
-   Do a proper analysis of the current functionality before you start implementing.
-   Keep in mind the DRY _(don't repeat yourself)_ principle
