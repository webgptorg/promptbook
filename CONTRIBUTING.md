# 👩‍💻 Contributing to Promptbook

Thank you for considering contributing to Promptbook! Here are some guidelines to help you get started:

## How to Contribute

1. **Fork the repository** and create your branch from `main`.
2. **Write clear, concise commit messages**.
3. **Add changes in [Changelog](/changelog/_current-preversion.md)**
4. **Test your changes** to ensure they work as expected, use `npm run check` _(typecheck, tests and package checks)_

## Reporting Issues

If you encounter any issues, please [open an issue](https://github.com/webgptorg/promptbook/issues) with a clear description and steps to reproduce the problem.

## Code Style

-   Follow the existing code style and structure.
-   Use comments to explain complex logic.

## Community

Join our [Discord community](https://discord.gg/x3QWNaa89N) or participate in [GitHub discussions](https://github.com/webgptorg/promptbook/discussions).

Thank you for contributing!

## How to Get Help

If you're stuck or unsure how to contribute, [just ask!](https://github.com/webgptorg/promptbook/discussions) We welcome questions, ideas, and feedback from everyone-whether you're a developer, designer, writer, or user.

## 🎯 Planned work

Planned work is kept as tasks in [tasks/](./tasks/). The project is maintained with Promptbook itself; the agent team that works through these tasks is described in [agents/README.md](./agents/README.md).

## Markers

-   `@@@` Marks a place where text / documentation / ... must be written. A task that still contains `@@@` is an unwritten placeholder which `ptbk` never runs _(list them with `ptbk find-unwritten`)_.
-   3x `!` Marks a place that needs to be fixed before releasing a pre-release version. _(In Markdown task files, exclamation marks set the task priority instead.)_
-   4x (and more) `!` Marks a place that needs to be fixed as soon as possible.
-   `[⚫]` Code in this file should never be published in the `ptbk` package

## 🔐 Security

Please do not report security vulnerabilities in public issues. Email [security@ptbk.io](mailto:security@ptbk.io) and see the [Security Policy](./SECURITY.md) for supported versions and response times.
