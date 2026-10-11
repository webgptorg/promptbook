# Releasing ptbk

The repository publishes exactly one package, `ptbk`. Its executable is `bin/ptbk.js`, with the compiled runtime under `dist/`. There are no publishable workspaces or legacy scoped-package release jobs.

## One-time npm configuration

In the `ptbk` package settings on npmjs.com, add a GitHub Actions trusted publisher with:

- Organization/user: `webgptorg`
- Repository: `promptbook`
- Workflow filename: `publish.yml`
- Environment: leave blank (the workflow does not use a GitHub environment)
- Allowed action: enable direct `npm publish`

The release tag is checked on Linux, macOS and Windows with Node 22 and 24 before publishing. Manual retries check the selected release tag across that same matrix. The hosted release runner uses Node 24, disables release caches, grants `id-token: write` and requests provenance. No npm credential is required on the machine running `npm version`. A publishing-capable granular token stored as GitHub Actions secret `NPM_TOKEN` is an optional fallback. See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) for account setup and configuration expiry. A publisher allowed only to stage uploads will not provide automatic publication; direct publish permission is required for this workflow.

## Release from your checkout

Finish the normal review and commit process, then run one of:

```bash
npm version patch
npm version minor
npm version major
npm version preminor
npm version prerelease
```

The corresponding `release:patch`, `release:minor`, `release:major`, `release:preminor` and `release:prerelease` npm scripts are shortcuts.

1. `preversion` checks that HEAD is on a named branch and the working tree is clean, including untracked files. It rejects a custom tag prefix, checks TypeScript and validates the single package, executable and matching lockfile. Failure leaves the package version unchanged.
2. npm updates `package.json` and `package-lock.json`, creates the version commit and tags it `vVERSION`.
3. `postversion` verifies the matching committed metadata and that the exact tag points at HEAD. It atomically pushes that commit to the branch's upstream and pushes only that release tag. Without an upstream it uses `origin` and the current branch name. No unrelated tags are pushed.
4. The pushed `v*` tag triggers **Publish ptbk**. Actions checks out that exact tag, uses a frozen dependency installation, validates the tag against manifest/lockfile and runs the full checks via `prepublishOnly`. `prepack` builds the distributable before npm uploads it with provenance.
5. Verification waits up to ten minutes for the public registry, checks version, tarball integrity and the `latest` tag, then installs unversioned `ptbk` locally and globally into temporary directories and checks their executable versions.

Normal releases, including numeric prereleases, retain this repository's `latest` channel policy. Default `npm install ptbk` and `npm install --global ptbk` therefore select the new CLI. GitHub Release creation is optional; the pushed Git tag triggers publication.

Local versioning requires permission to push to the selected Git remote. If branch protection rejects direct pushes, use the repository's authorized release branch/process; the script does not bypass protection. The Actions workflow publishes only in `webgptorg/promptbook`.

## Retry failures without another version bump

If the atomic push fails, both remote refs remain unchanged and your local version commit/tag remain available. Fix authentication, upstream configuration or the rejected push, then run:

```bash
npm run postversion
```

Retry from the clean version commit. If the tag was pushed but CI failed before npm accepted the upload, rerun that workflow, or use **Publish ptbk → Run workflow** with the existing `vVERSION` tag. Manual dispatch uses the existing immutable release tag rather than the current branch contents.

If npm accepted the upload but registry verification failed, do not republish that version: npm versions cannot be overwritten. Inspect the registry and retry verification:

```bash
npm run release:verify
```

The propagation deadline retries temporary missing versions, network errors and stale dist-tags. Authentication failures and inconsistent artifact metadata fail immediately.

## Check without publishing

```bash
npm ci
npm run check
npm pack
```

`npm pack` runs the build and emits the distributable tarball; `test:package` installs a disposable tarball and tests both local/global links, offline npx and npm scripts. Plain local `npm publish` is rejected; publication belongs to GitHub Actions.

For a local-only version change, `npm version patch --no-git-tag-version` explicitly skips Git preflight, commit, tag and push. Type and package checks still run. Restore or commit that change through the normal workflow before performing a release.
