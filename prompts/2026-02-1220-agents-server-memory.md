[x] - Implemented by OpenAI Codex `gpt-5.3-codex` but KCD II killed just before the final commit, so I am doing the final commit manually. The code is already implemented, just not committed.

[✨👸] Implement user memory

```book
My personal AI Agent

PERSONA Lawyer specialized in intellectual property.
MEMORY Remember projects user is working on
CLOSED
```

-   Add commitment `MEMORY` that will be used to store user memories. It should internally create a tool call to store and retrieve user memories, but the user should not see this, they should just use `MEMORY` commitment in the book to store and retrieve memories.
-   You can add additional instructions to the MEMORY commitment which will be added into the Agent model Requirements system message.
    -   `MEMORY Remember only things about the moral values of the user.`
    -   Look how this mechanism is implemented for example in the `USE SEARCH ENGINE` commitment.
-   User memories should be saved as user data. They are connected with locked-in user. The `admin` with `ADMIN_PASSWORD` is user "admin" and also has its own memory. When the user is deleted, the memory should be deleted as well.
-   User memories are per user and per agent.
-   When the agents are talking together in a `TEAM`, they don't have memories.
-   User memories should be stored in a table `UserMemory`
-   Create database migration for the change
    -   Migrations are located in `/apps/agents-server/src/database/migrations`
    -   Be aware that table names in migrations have prefix `prefix_` _(look at existing migrations for reference)_
-   Create a chip for the memory retrieval, and when the memory is used, show the chip.
    -   Look how other chips in the system work, for example `USE SEARCH ENGINE`, `KNOWLEDGE`, `TEAM`, and do the same for `MEMORY`. The chip should show the content of the memory that is retrieved or stored.
-   Create a simple menu under "System" -> "User Memory" where the user can see all the memories that are stored for the logged in user, and also do CRUD operations on them.
    -   User should see this memory per agent.
    -   But the user has the option to make one memory global.
-   When the user is not logged in, the memories are disabled
    -   But still, in other mechanisms (like self-learning), it is working as it is working now. Do not change them in any way.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   This is a big change. Do a proper analysis of the project before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨👸] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨👸] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨👸] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
