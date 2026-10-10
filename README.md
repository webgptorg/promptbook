# ptbk coder

`ptbk` is the repository’s single npm package. It installs the `ptbk coder` CLI for local coding tasks, with interchangeable coding harnesses, project checks, Git persistence, and a persistent loopback dashboard.

Requires Node.js 22.13+ in the Node 22 line, or Node 24+, npm 10+, and Git. macOS and Linux are target platforms; use WSL on Windows. Install a coding harness separately and authenticate with its provider.

```bash
# Global installation
npm install --global ptbk
ptbk coder init --path ./my-project

# Or install into a project
npm install --save-dev ptbk
npx ptbk coder init
npx ptbk coder add "Fix CSV quoting and add a regression test"
npx ptbk coder list
npx ptbk coder run --harness openai-codex --dry-run
npx ptbk coder run --harness openai-codex --check "npm run check"
```

The coder owns task state and commits. Harnesses receive instructions to leave commits to the coder. Initial project changes are preserved; the default run refuses a dirty working tree. Pull and push require explicit flags. `list` and `run --dry-run` are offline read-only operations.

Current Codex account execution requires explicit `--allow-credits` because its CLI cannot enforce the default credit prohibition. Add that flag only when authorizing account credits; see [the credit policy and provider limits](docs/coder.md#harnesses-planning-and-team).

New work is stored as task Books under `tasks/`. Existing top-level Markdown tasks under `prompts/` remain supported by the same engine. Agent Books under `agents/` define roles and are distinct from task Books.

See [the coder guide](docs/coder.md), [compatibility and verification](docs/compatibility.md), `ptbk coder --help`, and [the specification](https://github.com/webgptorg/promptbook/blob/main/specs/coder.md). Run `npm run check` to verify the build, deterministic fixtures, and installation of the actual npm tarball in an external project.

This prerelease replaces the old collection of npm packages. Publishing runs only in GitHub Actions when a `vVERSION` tag is pushed. From a clean, committed tree on a named branch, `npm run release:preminor` or `npm run release:prerelease` checks the release, creates npm's version commit/tag, and atomically pushes the branch and exact tag. Normal releases, including numeric prereleases, use `latest` so the default install gets the current CLI. See [release and push-retry instructions](docs/coder.md#releasing).
