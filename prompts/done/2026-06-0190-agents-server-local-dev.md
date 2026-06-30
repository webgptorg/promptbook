[x] ~$0.3873 an hour by OpenAI Codex `gpt-5.4`

[✨🤠] Into (`terminals.json`)[.vscode/terminals.json] add script for propper local development of Agents server

-   Now there is just "✨👨‍💻 Run ptbk agents-server start"
    -   But it lacks hotreloading and runs in next production mode, which is not good for local development and debugging
-   The locally run server should run via `ptbk agents-server dev` command, which will run the server in development mode with hotreloading and all the necessary environment variables for local development and debugging
-   This will just wrap the `next dev` in a same things as `ptbk agents-server start`
-   Keep in mind the DRY _(don't repeat yourself)_ principle, share the code between the start and dev scripts as much as possible
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)

---

[-]

[✨🤠] brr

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🤠] brr

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🤠] brr

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

