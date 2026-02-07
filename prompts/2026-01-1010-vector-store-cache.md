[ ] !!!!!!!!!!!

[✨🦂] Cache the Vector Stores created in OpenAI

-   Now the vector stores are created on the fly when the Promptbook agent need to answer and are cached in table `Agent` column `preparedExternals`
-   Remove the column `preparedExternals` and create a new table `AgentExternals`
    -   For context look how other tables looks to preserve the consistency and naming conventions.
    -   This table should have at least the following columns:
        -   `id` - primary key
        -   `type` - type of the external _(in this case `VECTOR_STORE`)_
        -   `hash` - hash of the external, for vector stores it should be based solely on the files (not the entire source of the (Promptbook) agent), so if the same files are used, the same vector store will be used, even for different (Promptbook) agents. Also order of the files should not matter, so the hash should be created in a way that the same files in different order will produce the same hash. Just be aware that same file names can have different content, so the hash should be based on the content of the files, not just the names. Use some hashing algorithm for this, for example SHA256 and merkle trees if needed.
    -   In future, this table will be used to store multiple types of externals like skills, MCPs,... But for now, we will focus only on vector stores.
-   When there are two different (Promptbook) agents which have the same files. Now there will be two identical vector stores created for these (Promptbook) agents. With this change, only one vector store will be created and shared between these (Promptbook) agents. Also when the (Promptbook) agent is modified without changing the files, the existing vector store will be reused without any need for creating a new one.
-   Create database migration for the change
    -   Migrations are located in `/apps/agents-server/src/database/migrations`
    -   Be aware that table names in migrations have prefix `prefix_` _(look at existing migrations for reference)_
-   For additional context, you can look at the [migration file from OpenaAI Assistants to AgentKit](prompts/2026-01-1000-migrate-to-agent-kit.md)
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   This should work in the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[ ] !!!!!!!!!!!

[✨🦂] Use locking mechanism to avoid creating two same vector stores at once.

-   (@@@ - Just remove)
-   Use the `GenerationLock` already used for preventing from generating the same image twice.
-   Leverage to the same principle when creating vector stores in OpenAI.
-   Create database migration for the change if needed
    -   Migrations are located in `/apps/agents-server/src/database/migrations`
    -   Be aware that table names in migrations have prefix `prefix_` _(look at existing migrations for reference)_
-   For additional context, you can look at the [migration file from OpenaAI Assistants to AgentKit](prompts/2026-01-1000-migrate-to-agent-kit.md), [migration 2 file from OpenaAI Assistants to AgentKit](prompts/2026-01-1010-vector-store-cache.md)
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   This should work in the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨🦂] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨🦂] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)
