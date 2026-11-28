[-] <- Note: This crashed multiple times in models `2025-08`, try it later

[✨★] /deep-planning Lot of the code will end up duplicated in multiple published packages

For example `$deepFreeze` (`src/utils/serialization/$deepFreeze.ts`) is exported from `@promptbook/utils`
but also used in `ZERO_USAGE` (`src/execution/utils/usage-constants.ts`) which is exported from `@promptbook/core`.

So the source code of `$deepFreeze` is now duplicated in two places:

1. `@promptbook/utils`
2. `@promptbook/core`

We want to avoid this duplication, so we should:

-   Export it only from `@promptbook/utils`
-   `@promptbook/core` should import it from `@promptbook/utils`

There are lot of entities (functions, classes, types,...) that are duplicated in multiple packages, our packages has big bundle size because of this problem, modify deployment scripts to fix this problem.

---

[-]

[✨★] qux

---

[-]

[✨★] qux

---

[-]

[✨★] qux
