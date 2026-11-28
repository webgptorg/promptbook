# Servers registry draft updates could create incomplete state and fail type checking

While adding a regression test for preventive project DNS guidance in `/superadmin/servers`, TypeScript reported that [`useServersRegistryState.ts`](../apps/agents-server/src/app/superadmin/servers/useServersRegistryState.ts) could write a partial `ServerDraft` when an update arrived before the row's draft had been initialized.

## Impact

The inferred state updater result did not satisfy `Record<number, ServerDraft>`, which blocked type-checking any test or build that imported `ServersRegistryTable`.

## Resolution

The update now ignores an update for a missing draft and only spreads a complete existing `ServerDraft`. Normal loaded rows are unchanged, while the state invariant and type check are preserved.
