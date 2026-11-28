# Agents Server E2E mock treats every `ilike` filter as a match

After fixing Adam's implicit self-inheritance through its name URL alias, the Agents Server E2E suite advances further but still fails once more than one agent has been created in the shared mock database.

## Failure

The production Supabase collection resolves an agent identifier with this filter shape:

```text
agentName.eq.<identifier>,permanentId.ilike.<identifier>
```

`tests/e2e/mockSupabaseServer.cjs` implements `eq`, `is`, `not.eq`, `not.is`, and `in`, but it does not implement `ilike`. An unrecognized clause falls through and returns `true`. Inside the `or` filter, the unsupported `permanentId.ilike` branch therefore matches every row.

Once the first test agent exists, every later lookup by permanent ID can return that first row. Server logs confirm newly generated permanent IDs repeatedly resolving to the first agent's name and source. This causes stale profile routes, missing quick buttons, management API 500 responses, and eight cascading Playwright failures.

## Evidence

-   `tests/e2e/management-api.spec.ts` passes in isolation against a fresh mock database.
-   Running the four affected spec files together yields `8 passed` and `8 failed`.
-   The complete `npm test` run reaches a successful build and Jest run, then finishes Playwright with `11 passed` and `8 failed`.

## Scope

This is independent of implicit `FROM @Adam` resolution and was left unchanged because the current prompt explicitly forbids unrelated fixes. A scoped follow-up should implement PostgREST-compatible `ilike` matching in `matchesRowFilters` and cover mixed `eq`/`ilike` `or` filters with a mock-server test.
