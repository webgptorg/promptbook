# Recurring "task manager sorted by finished time" prompt is already fixed — deployment-lag false-positive

The prompt [`prompts/2026-07-0740-agents-server-sort-tasks.md`](../prompts/2026-07-0740-agents-server-sort-tasks.md) ("The tasks in task manager should be sorted by finished time / the self-update task always shows on top") describes a bug that **no longer exists on `main`**. It was fixed on 2026-07-22 by commit `0ab5ede20` and has been re-dispatched ~15 times since; every re-run only appends a trailing line to the prompt `.md` (`git show --stat` on each of `e5d660e18`, `7b105650b`, `73436672d`, `2003b3b87` = `1 insertion(+)`, **zero code changed**).

## Why the screenshot is misleading

The screenshot (`screenshots/2026-07-0740-agents-server-sort-tasks.png`, `s24.ptbk.io/admin/task-manager`) is dated **2026-07-07**, before the fix. Its order — two self-updates (`2h`, `17h`) grouped above two chats (`7h`, `10h`) — is impossible under current code. It is the signature of `[...injectedRows, ...databaseRows]` **without** a cross-group re-sort, i.e. pre-fix behaviour. Current code yields `2h, 7h, 10h, 17h`.

## Where the fix lives (all funnel through one comparator — DRY)

-   [`apps/agents-server/src/utils/getAdminChatTasksResponse/getAdminChatTasks/compareAdminChatTasks.ts`](../apps/agents-server/src/utils/getAdminChatTasksResponse/getAdminChatTasks/compareAdminChatTasks.ts) (`all` case, lines 89–101) — sorts by `resolveAdminChatTaskTimelineTimestamp` DESC, which resolves to `finishedAt` for terminal tasks.
-   [`.../getAdminChatTasks/adminChatTaskSqlQuery.ts`](../apps/agents-server/src/utils/getAdminChatTasksResponse/getAdminChatTasks/adminChatTaskSqlQuery.ts) line 265 — matching Postgres `ORDER BY` (`createAdminChatTaskTimelineExpressionSql DESC NULLS LAST`).
-   [`.../getAdminChatTasksResponse/adminChatTaskInjection.ts`](../apps/agents-server/src/utils/getAdminChatTasksResponse/adminChatTaskInjection.ts) lines 138–140 — self-update rows are **injected process-local** (never DB rows) and `mergeInjectedAdminChatTasks` re-sorts `[...injectedTasks, ...databaseItems]` via the same comparator, so injected rows cannot be pinned on top. `getVpsAdminChatTasksResponse.ts` mirrors this merge. The client renders `state.tasks` verbatim (no client-side re-sort).

## Tests already cover the exact screenshot scenario

-   [`compareAdminChatTasks.test.ts`](../apps/agents-server/src/utils/getAdminChatTasksResponse/getAdminChatTasks/compareAdminChatTasks.test.ts) — comparator in isolation.
-   [`getAdminChatTasksResponse.test.ts`](../apps/agents-server/src/utils/getAdminChatTasksResponse.test.ts) — full injection-merge pipeline; asserts the `17h` self-update sinks below the `7h`/`10h` chats and `total === 4`.

Both use `REFERENCE_TIMESTAMP = 2026-07-07T12:00:00.000Z` to mirror the screenshot's relative times. Changelog entry present (`changelog/_current-preversion.md`, "…ordered by finished time, with the newest finished task on top").

## Recommendation

Root cause of every re-report is **deployment lag** (the `s24` build predates the fix — see [`2026-07-2100-agents-server-self-update-frozen-installer.message.md`](./2026-07-2100-agents-server-self-update-frozen-installer.message.md) for the "fixes take effect one update later" mechanism). **Retire/stop re-dispatching this prompt** and instead verify the `s24` deployment self-updates past `0ab5ede20`. No code change is warranted; re-implementing would duplicate a tested fix.
