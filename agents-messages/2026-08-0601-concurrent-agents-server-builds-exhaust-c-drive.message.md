# Concurrent Agents Server builds can exhaust `C:`

While verifying the project-card change, one `npm run test-for-ptbk-coder` build and an unrelated
`npm test` E2E build ran at the same time. Both invoke the Agents Server's Next production build and
write a multi-gigabyte `.next` output on `C:`. The drive reached `0 B` free space; the build then
reported:

```text
[webpack.cache.PackFileCacheStrategy] Caching failed for pack: Error: ENOSPC: no space left on device, write
```

At the time of the failure, `apps/agents-server/.next` alone measured approximately `7.46 GiB` and
the other filesystem volume (`X:`) had more than `1 TiB` available. This is not related to the
project-card implementation.

## Suggested next step

Serialize heavy Agents Server builds in the shared workspace, or run isolated builds with
`NEXT_DIST_DIR` and `TEMP`/`TMP` directed to a spacious per-run location (for example on `X:`).
That prevents a verification run from consuming the same `.next` and Sentry temporary-output space
as an active E2E build.
