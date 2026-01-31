[ ]

[✨💽] Re-generate supabase typescript schema from `./migrations/*.sql` in file `apps/agents-server/src/database/schema.ts`

---

[ ]

[✨💽] Re-generate this sub-schema from `/apps/agents-server/src/database/schema.ts` (which was generated from `/apps/agents-server/src/database/migrations/*.sql`) in file `src/collection/agent-collection/constructors/agent-collection-in-supabase/AgentsDatabaseSchema.ts`

-   `AgentsDatabaseSchema` is strict subset of `AgentsServerDatabase`
-   Generate Supabase TypeScript schema which is a subset of `AgentsServerDatabase`
-   containing only tables `Agent` and `AgentHistory`
