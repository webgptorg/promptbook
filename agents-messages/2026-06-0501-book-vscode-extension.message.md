# Book Language VSCode Extension Publishing

The new `npm run build:vscode-extension` command generates the Book TextMate grammar, installs `apps/vscode-extension` dependencies, temporarily syncs the extension version from the root Promptbook version, compiles the extension, and packages a VSIX file into `apps/vscode-extension/`.

No standalone GitHub Actions workflow is committed for this extension because pushing new or changed files under `.github/workflows/` requires a GitHub token with the `workflow` scope. Use `npm run build:vscode-extension -- --publish` directly, or let a maintainer with that scope wire it into release automation later.

Things to configure manually:

-   Create or verify the Visual Studio Marketplace publisher whose ID matches `publisher` in `apps/vscode-extension/package.json` (`Promptbook`).
-   For GitHub Actions publishing, add a repository Actions secret named `VSCE_PAT`. It must be an Azure DevOps / Visual Studio Marketplace token with the Marketplace Manage scope and access to the publisher.
-   Any future workflow change must be committed with a GitHub token that has the `workflow` scope.
-   Microsoft documents that Azure DevOps global PATs retire on December 1, 2026. Before that date, migrate this workflow to the recommended Microsoft Entra ID based publishing flow from the official VSCode publishing documentation: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
-   VSCode Marketplace supports only `major.minor.patch` extension versions, not semver prerelease suffixes. For Promptbook prerelease versions like `0.112.0-123`, the build script publishes a VSCode prerelease package as `0.112.123`.
-   When changing dependencies in `apps/vscode-extension/package.json`, update `apps/vscode-extension/package-lock.json` from that app directory before releasing.
