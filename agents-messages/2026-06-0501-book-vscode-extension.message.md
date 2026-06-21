# Book Language VSCode Extension Publishing

The new `npm run build:vscode-extension` command generates the Book TextMate grammar, installs `apps/vscode-extension` dependencies, temporarily syncs the extension version from the root Promptbook version, compiles the extension, and packages a VSIX file into `apps/vscode-extension/`.

The GitHub Actions workflow `.github/workflows/publish-vscode-extension.yml` runs on every `v*` tag, calls `npm run build:vscode-extension -- --publish`, publishes the VSIX to the Visual Studio Code Marketplace, and uploads the VSIX to the matching GitHub Release.

Things to configure manually:

-   Create or verify the Visual Studio Marketplace publisher whose ID matches `publisher` in `apps/vscode-extension/package.json` (`Promptbook`).
-   Add a repository Actions secret named `VSCE_PAT`. It must be an Azure DevOps / Visual Studio Marketplace token with the Marketplace Manage scope and access to the publisher.
-   Microsoft documents that Azure DevOps global PATs retire on December 1, 2026. Before that date, migrate this workflow to the recommended Microsoft Entra ID based publishing flow from the official VSCode publishing documentation: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
-   VSCode Marketplace supports only `major.minor.patch` extension versions, not semver prerelease suffixes. For Promptbook prerelease versions like `0.112.0-123`, the build script publishes a VSCode prerelease package as `0.112.123`.
-   When changing dependencies in `apps/vscode-extension/package.json`, update `apps/vscode-extension/package-lock.json` from that app directory before releasing.
