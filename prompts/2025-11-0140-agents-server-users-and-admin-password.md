[x]

[✨👹] Implement admin and user permissions

-   There will be `process.env.ADMIN_PASSWORD` environment variable set in the environment, it will be admin password
-   This is just lightweight permissions system, no user accounts, just one hardcoded admin password
-   This will be just light implementation of the permissions system for Agents Server, one admin token, just admin and non-admin anonymous users, propper user system will be implemented later, mark all the places with:
    -   `// TODO: [👹] Implement proper user system`
    -   `/* <- TODO: [👹] Here should be user permissions */`
    -   ... etc
-   When `process.env.ADMIN_PASSWORD` not set, then all users are admins _(current behaviour)_
-   When NOT logged as admin, then:
    -   Cannot access `/agents/[agentName]/book` page (Book Editor)
    -   Cannot create new agents on `/` page
    -   Does not see "Models", "About" and "Technical Information" on `/`
    -   Can list and use existing agents
    -   Can chat with agents
-   Implement some pretty 403 Forbidden page when non-admin user tries to access admin-only pages
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨👹] Add table `User` to the database to store admin and user passwords

-   The table `User` should work together with the `process.env.ADMIN_PASSWORD`, `process.env.ADMIN_PASSWORD` is like one of the admin users in the `User` table
-   Add `isAdmin` BOOLEAN column to the `User` table to distinguish admin and non-admin users
-   Admin can list, create, modify and delete users
-   Admin sees the list of users in the `/` after the list of agents before list of models
-   Non-admin users can only log in and log out but cannot see the list of users, edit agents etc. - they are like anonymous users with no permissions
-   Passwords should be stored hashed and salted using a strong hashing algorithm like bcrypt
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨👹] quux

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨👹] quux

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
