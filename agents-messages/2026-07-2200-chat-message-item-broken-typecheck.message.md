# Pre-existing TypeScript error in `ChatMessageItem.tsx` on `main`

While working on standalone VPS multi-server SQLite isolation for the Agents Server, `npx tsc --noEmit -p apps/agents-server/tsconfig.json` surfaced one type error that is unrelated to that change and already fails on unmodified `main`.

## Where

[`src/book-components/Chat/Chat/ChatMessageItem.tsx`](../src/book-components/Chat/Chat/ChatMessageItem.tsx) line 40:

```
error TS2305: Module '"./constants"' has no exported member 'RATING_STAR_SYMBOL'.
```

## Why it fails

Commit `ad6381036` — `Revert "[🌟⭐] Stars are all yellow despite of picked stars, fix it"` — reverted the change that (re)moved the `RATING_STAR_SYMBOL` export in `src/book-components/Chat/Chat/constants.ts`, but `ChatMessageItem.tsx` still imports `RATING_STAR_SYMBOL` from `./constants`. The import and the export are now out of sync.

## What I did

The revert `ad6381036` removed both `{RATING_STAR_SYMBOL}` usages from `ChatMessageItem.tsx` but missed the import line, so the import was orphaned **and unused** — and it broke `next build` (type validation) for the whole repository, blocking `npm test` verification of any change.

Because the server-isolation task requires the build/tests to pass for verification, the orphaned import line was removed as part of that change. This exactly restores the file to its pre-`05d55d382` state, completing the revert. No behavior change — the symbol was not referenced anywhere in the file.
