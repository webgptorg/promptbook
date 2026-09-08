# The generated `@promptbook/cli` tarball can contain local SQLite state

While dry-running the generated CLI package as part of an unrelated installer fix, the following command succeeded and
listed local database files in the tarball:

```bash
npm pack --dry-run --json ./packages/cli
```

The output includes these runtime-state paths (and their SQLite journal sidecars):

- `apps/agents-server/agents-server.sqlite`
- `apps/agents-server/servers/default.sqlite`

These files are ignored by the repository, but package generation recursively copies `apps/agents-server` into
`packages/cli/apps/agents-server` in
[`generate-packages.ts`](../scripts/generate-packages/generate-packages.ts). Its copy filter excludes build artifacts,
environment files, and tests, but not `*.sqlite`, `*.sqlite-shm`, or `*.sqlite-wal`. The generated CLI's `.npmignore`
also does not exclude them, so npm considers the copied database state publishable.

This can publish local Agents Server data and SQLite WAL contents with a release. No packaging behavior was changed in
this task because it is outside the Node.js 26 dependency-update scope. A follow-up should exclude SQLite state during
the runtime copy and add a package-content regression check.
