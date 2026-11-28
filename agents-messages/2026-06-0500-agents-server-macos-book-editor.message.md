# Book Editor macOS Publishing

The new `npm run build:book-editor-macos` command installs the app dependencies, temporarily syncs the Electron app version with the root Promptbook version, and packages DMG files into `apps/book-editor-macos/release/`.

No standalone GitHub Actions workflow is committed for this app because pushing new or changed files under `.github/workflows/` requires a GitHub token with the `workflow` scope. Use the local build command directly, or let a maintainer with that scope wire it into release automation later.

Things to decide or configure manually:

-   The current build creates an unsigned DMG. Users can install it, but macOS Gatekeeper may warn because the app is not signed or notarized.
-   For public distribution without Gatekeeper warnings, add Apple Developer signing and notarization secrets to the repository, then update the release automation and `apps/book-editor-macos/package.json` Electron Builder config to use them.
-   If this is added to GitHub Actions later, the workflow should use the automatic `GITHUB_TOKEN` with `contents: write` for release uploads, and it must be committed by a token with the `workflow` scope.
-   When changing dependencies in `apps/book-editor-macos/package.json`, update `apps/book-editor-macos/package-lock.json` from that app directory before releasing.

## Running `npm run build:book-editor-macos` on Windows

-   The `spawnSync npm.cmd EINVAL` failure that previously occurred when running this script on Windows has been fixed in `scripts/book-editor-macos/build-book-editor-macos.js` by passing `shell: process.platform === 'win32'` to `execFileSync` (the same pattern already used by `scripts/vscode-extension/build-vscode-extension.js`). This is required because newer Node.js versions (CVE-2024-27980) refuse to spawn `.cmd` shims without an explicit shell.
-   **The final packaging step (`electron-builder --mac dmg --x64 --arm64`) still has to run on macOS.** `electron-builder` cannot produce a signed, valid `.dmg` from a Windows host because DMG creation, code signing, and notarization require macOS-only Apple tooling. Running the script on Windows now reaches `npm ci` and `npm run package` without spawn errors, but the `electron-builder` step will fail later on Windows. Run the script on a macOS machine (or in a macOS CI runner) to actually produce the DMG artifacts.
