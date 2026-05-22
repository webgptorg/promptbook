[ ] !!!

[✨👠] Cache the optimized production build of Agents server

```bash
me@DESKTOP-2QD9KQQ MINGW64 ~/work/ai/promptbook (main)
$ npx ts-node ./src/cli/test/ptbk.ts agents-server start --agent github-copilot --model gpt-5.4 --thinking-level xhigh --port 4440
Starting Promptbook Agents Server on port 4440.
[next-build]    ▲ Next.js 15.4.11
[next-build]    - Environments: .env
[next-build]    - Experiments (use with caution):
[next-build]      ✓ externalDir
[next-build]    Creating an optimized production build ...
... takes a while ...
```

-   Do not rebuild the Next.js app on every `ptbk agents-server start` if the source files haven't changed since the last build, to speed up server startup and reduce unnecessary CPU usage during development and testing.
-   Create `ptbk agents-server build` which will prebuild the Next.js app
-   Both `ptbk agents-server start` and `ptbk agents-server build` should build the app if its not built yet
-   `ptbk agents-server build` should always rebuild the app
-   `ptbk agents-server start` should only build if there are changes since the last build, otherwise it should use the cached build
-   But add flag `--force-build` to `ptbk agents-server start` to allow bypassing the cache and forcing a rebuild when needed
-   Keep in mind the DRY _(don't repeat yourself)_ principle, especially share logic between the two commands to avoid duplication of build steps and caching logic.
-   Do a proper analysis of the current functionality of `ptbk agents-server` and related functionality before you start implementing.
-   You are working with [`ptbk agents-server`](src/cli/cli-commands/agents-server/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
