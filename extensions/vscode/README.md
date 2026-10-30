# Promptbook .book language support

Write agents, tasks and chats in the Book language used by [Promptbook](https://ptbk.io/).

- Syntax highlighting for current commitments, their aliases, references and Markdown content.
- Keyword completion, hover explanations, agent/task/chat snippets, document outline and folding.
- Live syntax and MODEL diagnostics from the engine's own parser. Saving remains possible.
- Go to Definition for `@Name` and `{Name}` references within a workspace folder. Multiple matching names remain multiple results; runtime-only entities do not have editor definitions.
- Read-only previews of historical `.bookc` archives, with no scripts or active archive content.

```book
AGENT Developer
PERSONA You maintain the project's software.
GOAL Keep the project reliable and understandable.
RULE Preserve public interfaces.
```

The extension supports `.book`, `.book.md`, `.ptbk` and `.ptbk.md` files. It runs locally without an AI provider, engine process or credentials. It does not execute tasks or rewrite files. Diagnostics cover source syntax and MODEL constraints; runtime scheduling, project-wide reference validity and effective inherited instructions remain engine checks.

## Installation

Install **Promptbook .book language support** (`Promptbook.book-extension`) from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=promptbook.book-extension), or install the matching `.vsix` from a [Promptbook GitHub Release](https://github.com/webgptorg/promptbook/releases) using **Extensions → Install from VSIX**.

## Development and releases

This extension now lives in `extensions/vscode` in the Promptbook repository. Its parser, vocabulary and MODEL validation are bundled directly from the same engine source; there is no separately maintained language implementation. The historical `webgptorg/book-extension` repository is a reference only. Its Marketplace publisher/name and icon are retained so existing installations can receive updates.

At the Promptbook repository root:

```sh
npm ci
npm run build
npm run typecheck:vscode
npm run test:vscode
npm run package:vscode
```

The build stages the extension under `dist-vscode/extension`; packaging writes `dist-vscode/book-extension-ptbk-<engine-version>.vsix` and its SHA-256 checksum. Use VS Code's **Run Book extension** debug configuration after building. No separate extension installation or npm lockfile is required. The root npm package excludes these assets.

Every official engine release builds/checks this extension from the same immutable tag, attaches the VSIX/checksum to the same GitHub Release and publishes the same Marketplace identity. Numeric npm prereleases use the regular Marketplace channel, following Promptbook's existing default npm installation policy.

Marketplace only accepts three numeric version fields and the legacy extension already reached `1.0.70`. The one engine version `M.m.p-n` maps to `(M+2).m.(p*100000+n)`; stable `M.m.p` uses `n=99999`. For example `0.119.0-38` → `2.119.38`, `0.119.0` → `2.119.99999`, `0.119.1-0` → `2.119.100000`. This preserves update ordering and distinguishes stable from prerelease without another manually bumped version. Prerelease counters must be `0..99998`; generated fields must fit signed 32-bit integers. Other prerelease formats fail explicitly and require an intentional mapping change. The VSIX manifest also records the complete original engine version as `promptbook.version`.

### One-time publisher setup

In the existing **Promptbook** Marketplace publisher, create a **Trusted Publishing** policy for:

- Repository owner: `webgptorg`
- Repository: `promptbook`
- Workflow: `publish.yml`
- Environment: leave empty (the job does not use a GitHub environment)

The release workflow grants `id-token: write` and uses `vsce publish --oidc`. If an existing `VSCE_TOKEN` GitHub secret is configured in the Promptbook repository, it can be used through `VSCE_PAT` instead. Never commit or log a publishing token. See [Microsoft's publishing documentation](https://code.visualstudio.com/api/working-with-extensions/publishing-extension).

A missing publisher policy/token makes the publication job fail visibly. Successful local packaging does not prove Marketplace access. A retry reuses identical GitHub assets and checks the actual Marketplace extension contents, including when the version already exists. A changed asset is rejected instead of overwritten.
