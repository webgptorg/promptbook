# Book Editor macOS Publishing

The new `npm run build:book-editor-macos` command installs the app dependencies, temporarily syncs the Electron app version with the root Promptbook version, and packages DMG files into `apps/book-editor-macos/release/`.

The GitHub Actions workflow `.github/workflows/publish-book-editor-macos.yml` runs on every `v*` tag and uploads the generated macOS app assets to the matching GitHub Release.

Things to decide or configure manually:

-   The workflow currently builds an unsigned DMG by setting `CSC_IDENTITY_AUTO_DISCOVERY=false`. Users can install it, but macOS Gatekeeper may warn because the app is not signed or notarized.
-   For public distribution without Gatekeeper warnings, add Apple Developer signing and notarization secrets to the repository, then update the workflow and `apps/book-editor-macos/package.json` Electron Builder config to use them.
-   The workflow uses the automatic `GITHUB_TOKEN` with `contents: write`. If release uploads fail, verify that GitHub Actions is allowed to write repository contents in the repository settings.
-   When changing dependencies in `apps/book-editor-macos/package.json`, update `apps/book-editor-macos/package-lock.json` from that app directory before releasing.

