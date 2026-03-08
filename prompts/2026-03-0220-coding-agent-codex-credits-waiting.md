[ ]

[✨🍌] OpenAI Codex runner: explicit credit spending + progressive waiting when rate-limited

-   When the coding agent uses OpenAI Codex, it can run in two ways: using rate limits (default) or using credits.
-   Add CLI flag `--allow-credits` to the Codex runner / codex prompts script; when passed, the runner is allowed to spend credits; when not passed, the runner must avoid spending credits.
    -   If credits are required to proceed but `--allow-credits` is not set, fail fast with a clear message that explains how to re-run with `--allow-credits`.
    -   If `--allow-credits` is set, proceed normally and allow Codex to spend credits.
-   When credits are wasted and we are waiting for limits to renew, implement a progressive waiting / backoff script that waits in increasing intervals (at least: 1m, 2m, 5m, 10m, 30m, …) until the Codex call can proceed.
    -   Implement this in a “smart” way: reset the backoff after a successful call; cap the maximum wait; add jitter; and print clear status logs with next retry time.
    -   The waiting should be triggered specifically on rate limit / quota style errors returned by the OpenAI Codex runner.
    -   Make the behavior similar to other coding runners (Claude Code / Gemini runners) in this repo (shared retry/backoff utility if possible) but keep primary focus on OpenAI Codex.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [coding script](scripts/run-codex-prompts) and the related runner/provider implementation for Codex @@@
-   Add tests for the progressive waiting/backoff logic (unit tests) @@@
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🍌] baz

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🍌] baz

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🍌] baz

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🍌] baz

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)
