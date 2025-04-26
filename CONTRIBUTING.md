# 👩‍💻 Contributing to Promptbook

Thank you for considering contributing to Promptbook! Here are some guidelines to help you get started:

## How to Contribute

1. **Fork the repository** and create your branch from `main`.
2. **Write clear, concise commit messages**.
3. **Test your changes** to ensure they work as expected.
4. **Submit a pull request** with a detailed description of your changes.

## Reporting Issues

If you encounter any issues, please [open an issue](https://github.com/webgptorg/promptbook/issues) with a clear description and steps to reproduce the problem.

## Code Style

-   Follow the existing code style and structure.
-   Use comments to explain complex logic.

## Community

Join our [Discord community](https://discord.gg/x3QWNaa89N) or participate in [GitHub discussions](https://github.com/webgptorg/promptbook/discussions).

Thank you for contributing!

## 🎯 Todos

There are a lot of TODOs in the repository, in the future there will probably be some kind of agent system that can automatically go through the TODOs and implement them one by one according to priority and rules.

See [TODO.md](./TODO.md)

## Emoji in `[brackets]`

-   `[any emoji]` Connects multiple places that are related to each other across the repository
-   `[number]` Connects multiple places that are related to each other across the file
-   `[🧠]` Marks a place where there is something to decide and think about.
-   `[🕕]` List of models *(that should be progresively updated)*
      - Prompt: Update available models and their prices, search online
-   `[🔼]` Marks an entity (function, class, type,...) in other project (like Promptbook.studio) which should be moved to this repository
-   `[🚉]` Marks an types / interfaces / structures fully serializable as JSON, not marking `string_` and `number_` prefixed aliases
-   `[🧹]` Need to implement garbage collection
-   `[🐣]` Easter eggs
-   `[💩]` Shitty code that needs refactoring
-   `$` When entity (function, class) starts by `$`, it means it is not pure and can have side effects.
-   3x `!` Marks a place that needs to be fixed before releasing a pre-release version.
-   4x (and more) `!` Marks a place that needs to be fixed as soon as possible.
-   `@@@` Marks a place where text / documentation / ... must be written.
-   [⚫] Code in this file should never be published in any package
-   [🟢] Code in this file should never be published into packages that could be imported into browser environment
-   [🔵] Code in this file should never be published outside of `@promptbook/browser`
-   [🟡] Code in this file should never be published outside of `@promptbook/cli`
-   [💞] Ignore a discrepancy between file name and entity name

<!--Import ./SECURITY.md-->
<!--⚠️ WARNING: This section was imported, make changes in source; any manual changes here will be overwritten-->

## 🐜 Security Policy

### Supported Versions

We provide security updates for the latest major version of Promptbook.

### Reporting a Vulnerability

If you discover a security vulnerability, please report it privately by emailing [security@ptbk.io](mailto:security@ptbk.io). We will respond as quickly as possible to address the issue.

<!--/Import ./SECURITY.md-->
