# `npm run test-for-ptbk-coder` strips `dependencies` from every generated package manifest

Found while making `npm run test-for-ptbk-coder` pass for the self-contained Stalwart mail server task (see [`changelog/_current-preversion.md`](../changelog/_current-preversion.md)). It is **unrelated to that task** and was therefore not fixed here, but it can publish broken packages, so it is reported instead.

## What happens

[`scripts/test-for-ptbk-coder.js`](../scripts/test-for-ptbk-coder.js) runs `test-package-generation` as one of its verification steps, which is

```
ts-node ./scripts/generate-packages/generate-packages.ts --skip-bundler
```

`--skip-bundler` skips the rollup step, and the rollup step is what discovers which external modules a package actually imports. [`PackageMetadata.additionalDependencies`](../scripts/generate-packages/PackageMetadata.ts) documents exactly this (`Note: If undefined, dependencies are not yet known`), but the generator still **rewrites** `packages/*/package.json` — now without the `dependencies` section it could not compute.

So merely *verifying* a task mutates tracked release artifacts in the working tree:

```
 M packages/cli/package.json
 M packages/color/package.json      -   "dependencies": { "spacetrim": "0.11.60" }
 M packages/components/package.json -   19 dependencies removed (openai, jspdf, katex, rxjs, ...)
 M packages/core/package.json
```

`git log -- packages/color/package.json` shows these files are otherwise only ever touched by `📦 Generating packages <version>` release commits.

## Why this matters

`ptbk coder` commits the whole working tree at the end of a round, so any task whose verification ran picks up these deletions. A release cut from such a commit publishes `@promptbook/components` and friends with **no runtime dependencies**, and `npm install` of those packages produces a package that cannot resolve `openai`, `jspdf`, `spacetrim`, … at runtime.

It is also a permanent source of confusing diff noise: every coder round starts with four modified manifests that have nothing to do with its prompt.

## Suggested next step

Make the dependency section untouchable when it cannot be computed. Options, cheapest first:

-   **Preserve the existing section under `--skip-bundler`** — read the current `dependencies` of `packages/<name>/package.json` and write it back unchanged when `additionalDependencies` is unknown. Keeps the verification step's purpose (proving generation works) without destroying information.
-   **Do not write `packages/*/package.json` at all under `--skip-bundler`** — generate into a temporary directory for verification purposes.
-   **Drop `test-package-generation` from [`test-for-ptbk-coder.js`](../scripts/test-for-ptbk-coder.js)** — it is the only verification step with side effects on tracked files, and `test-package-generation` is already covered by the release pipeline.

Until then, a coder round should `git checkout -- packages/` before committing.
