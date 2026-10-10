# Project checks and repairs

[Main specification](../_main.md) · [Dictionary](../dictionary.md)

`--check` specifies one project shell command. `--check-before` accepts `no` (default), `yes-and-fail`, `yes-and-fix`. An enabled initial check without an explicit command uses `npm run check`. If neither `--check` nor an enabled `--check-before` is provided, skip optional check phases; the UI must not claim tests passed.

`yes-and-fail` exits after failure. `yes-and-fix` creates one repair task and uses the shared repair service before entering the ordinary queue. `fix` always runs a check (using `npm run check` without explicit `--check`), repairs if necessary, checks again and exits; it never selects ordinary tasks.

A missing, recursive or uninitialized validation command is a setup error. Do not rewrite it into automatic success. Repair instructions prohibit removing assertions, lowering thresholds, disabling lint/checks or skipping builds merely to obtain a passing result.

Checks may modify files. They must check the exact content version intended for persistence, including scoped line-ending normalization. A private check view preserves the project's relative location, dependencies and required ignored files; import its result only if the live checkout still matches the captured boundary.

## Related specifications

- [Execution lifecycle](execution.md)
- [Attempts, retries and provider limits](retries.md)
- [Change ownership and Git persistence](git-persistence.md)
- [Project initialization](initialization.md)
- [User and CLI contracts](cli.md)
