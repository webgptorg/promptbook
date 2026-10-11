# Promptbook (`ptbk`)

Promptbook operates readable agent and task Books over a Git project. This repository publishes one npm package, `ptbk`, which installs the `ptbk` command. Runtime state, requests, traces and the shared browser profile live in ignored `.ptbk/` files.

Requires Node.js 22.13+ in the Node 22 line, or Node 24+, and npm 10+.

```bash
# Global installation
npm install --global ptbk
ptbk init --path ./project

# Project-local installation
npm install --save-dev ptbk
npx ptbk init
```

Initialization creates missing core agents, task templates and project conventions, preserving customized files. It offers supported harness installation and interactive authentication. `--no-install` skips installation; `--no-questions` avoids terminal prompts. Configure a meaningful project `check` script and commit the initialized project before starting work.

```bash
ptbk add "Implement the new behavior and its acceptance checks" --commit
ptbk list
ptbk run --dry-run
ptbk start                     # background agenda, localhost dashboard, reboot persistence
ptbk show                      # inspect the same process and pending requests
ptbk answer REQUEST_ID "Reply"
ptbk stop                      # intentional stop also disables automatic restart
```

`start` discovers available authenticated harnesses, uses Manager for missing assignments, and executes one task at a time. It requires reported outcome evidence and passing project checks before committing implementation, dated task completion and learning follow-ups together. It watches future work and materializes goal enquiries when no unfinished backlog remains. Failures retain work and expose recovery diagnostics.

Use `start --raw` for foreground logs or `start --interactive` for terminal controls. `--no-persist`, `--no-server`, `--no-qr` and `--port` customize startup. `run` executes a finite queue with one configuration; for example `ptbk run --harness openai-codex --check "npm run check" --limit 1`. Harness availability, account policy and capability checks happen before inference; unsupported installed provider features produce an actionable diagnostic.

Global installation, local `npx ptbk`, or a project script such as `"ptbk": "ptbk"` work outside this repository. Each process loads its own installed runtime/version and pins that installation for restart. See [runtime usage](docs/runtime.md), [compatibility and verification](docs/compatibility.md), and [the specification](https://github.com/webgptorg/promptbook/blob/main/specs/_main.md).

For development, use `npm ci` and `npm run check`. Checks validate types, deterministic integration fixtures and real tarball installations in disposable external projects. CI runs on Linux, macOS and Windows with Node 22 and 24.

For releases, run `npm version patch`, `npm version minor`, or `npm version prerelease` on a clean named branch after committing your work. Basic `preversion` checks run locally; `postversion` atomically pushes the version commit and exact `vVERSION` tag. GitHub Actions checks and publishes only `ptbk` with npm provenance, then verifies the public registry and installed CLI. Configure npm trusted publishing once as described in [releasing](docs/releasing.md).
