# Database Migrations

Database migrations define the persistent schema for Agents Server.

## Prefixing

Per-server tables are created from migration files that use `prefix_` in physical table names. At runtime, `prefix_` is replaced by the logical server table prefix.

Example:

```sql
prefix_Agent
```

becomes:

```text
server_example_com_Agent
```

The global `_Server` table is not prefixed.

## Backward Compatibility

Migrations MUST be backward compatible with earlier production server versions that may run against a database already migrated by a preview environment.

Allowed changes:

- add tables
- add columns
- add indexes
- add nullable or defaulted data needed by new features

Disallowed or high-risk changes:

- remove tables or columns used by older versions
- rename existing tables or columns
- change meaning of existing columns
- make existing nullable columns required without a safe default

When in doubt, migrations SHOULD add new structures instead of mutating existing semantics.

## Automatic Migrations

Automatic migrations may run at server startup.

They MUST be skipped when:

- tests are running
- Next.js build/static generation is running
- `SUPABASE_AUTO_MIGRATE` is `0`, `false`, or `no`
- no PostgreSQL connection string is available

Automatic migrations need `POSTGRES_URL` or `DATABASE_URL`.

## Migration Targets

Migration execution loads table prefixes from:

- registered `_Server` records
- `SERVERS` environment records
- `SUPABASE_TABLE_PREFIX` fallback

The executor MAY support selected targets for manual operations.

## Locking

PostgreSQL migrations SHOULD use an advisory lock so two processes do not run the same migration concurrently.

Automatic migration may skip if a lock cannot be acquired, depending on deployment policy. Manual migrations SHOULD report lock contention clearly.

## Local SQLite

Local SQLite mode uses a Supabase-shaped adapter. It MUST preserve:

- logical table names
- query-builder semantics used by the app
- value serialization/deserialization
- mutation defaults
- PostgREST-like filters
- read indexes needed by table schemas

SQLite is suitable for local development and tests. Production-compatible behavior is defined by PostgreSQL/Supabase schema and semantics.

## Generated Schema

Generated TypeScript schema files are helper artifacts and may lag behind migrations. Migration SQL is the schema source of truth for replication.

## Seeding

Default and core agent seeding runs after schema availability.

Seeding MUST:

- create default agents only when appropriate for an empty server
- always ensure local core agents in `.core`
- use the target server table prefix directly when running outside a Next.js request scope

See [Agents](../agents.md).

