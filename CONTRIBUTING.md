# 👩‍💻 Contributing to Promptbook

Thank you for considering contributing to Promptbook! Here are some guidelines to help you get started:

## How to Contribute

1. **Fork the repository** and create your branch from `main`.
2. **Write clear, concise commit messages**.
3. **Add changes in [Changelog](/changelog/_current-preversion.md)**
4. **Test your changes** to ensure they work as expected, use `npm test`

## Reporting Issues

If you encounter any issues, please [open an issue](https://github.com/webgptorg/promptbook/issues) with a clear description and steps to reproduce the problem.

## Code Style

-   Follow the existing code style and structure.
-   Use comments to explain complex logic.

## Community

Join our [Discord community](https://discord.gg/x3QWNaa89N) or participate in [GitHub discussions](https://github.com/webgptorg/promptbook/discussions).

Thank you for contributing!

## How to Get Help

If you're stuck or unsure how to contribute, [just ask!](https://github.com/webgptorg/promptbook/discussions) We welcome questions, ideas, and feedback from everyone—whether you're a developer, designer, writer, or user.

## 🎯 Todos

There are a lot of TODOs in the repository, in the future there will probably be some kind of agent system that can automatically go through the TODOs and implement them one by one according to priority and rules.

See [TODO.md](./TODO.md)

## Emoji in `[brackets]`

-   `[any emoji]` Connects multiple places that are related to each other across the repository
-   `[number]` Connects multiple places that are related to each other across the file
-   `[🧠]` Marks a place where there is something to decide and think about.
-   `[🕕]` List of models _(that should be progresively updated)_
    -   Prompt: Update available models and their prices, search online
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

## 🔐 Security Policy

### Introduction

At Promptbook, we take security seriously. This document outlines our security policy, including how to report vulnerabilities and which versions we actively support with security updates.

### Supported Versions

We maintain security updates for the following Promptbook versions:

| Version  | Supported          |
| -------- | ------------------ |
| Latest   | :white_check_mark: |
| < Latest | :x:                |

Security patches are applied to the most recent major version. We strongly recommend keeping your Promptbook installation updated to the latest version.

### Reporting a Vulnerability

If you discover a security vulnerability in Promptbook, please:

1. **Report privately**: Email us at [security@ptbk.io](mailto:security@ptbk.io)
2. **Include details**: Provide a clear description of the vulnerability and steps to reproduce
3. **Wait for confirmation**: We'll acknowledge your report within 48 hours

Please do not disclose security vulnerabilities publicly until we've had the opportunity to address them.

### Response Timeline

-   **Acknowledgment**: Within 48 hours
-   **Initial Assessment**: Within 1 week
-   **Remediation Plan**: Within 2 weeks
-   **Security Patch**: Timeline varies based on complexity

### Disclosure Policy

Once a vulnerability is confirmed and addressed, we work with reporters to coordinate an appropriate disclosure timeline. We appreciate your collaboration in keeping our users secure.

### Security Best Practices

When using Promptbook:

-   Keep your installation up to date
-   Use strong authentication mechanisms
-   Follow the principle of least privilege when configuring access
-   Review our documentation for security recommendations

<!--/Import ./SECURITY.md-->
