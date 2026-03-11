# 🔠 Promptbook Agents server

Agents Server is the main web application where Promptbook agents live

## Creating servers

When creating new Agents server, search across the repository for [☁]

-   [☁] [Add domain to environments](https://vercel.com/pavol-hejns-projects/promptbook-agents-server/settings/environments)
-   [☁] Add or update the server row in the global `_Server` database table
-   [☁] Run the `_Server` -> Vercel domain sync script
-   [☁] [Add to `.env` file](./.env)
-   [☁] If using `USE PROJECT` auto-auth, configure [GitHub App integration](./GITHUB_APP.md)
-   [☁] Add the server to [the list of our servers](https://docs.google.com/spreadsheets/d/1X26iMQqubsxftqD1EJNSlzPYFS94QjCFPXyKdHHDeVs/edit?gid=848307752#gid=848307752)
-   [☁] Run migration script _(run new instance)_
-   [☁] For testing servers, look at the server and change the `CORE_SERVER` to `https://core-test.ptbk.io/`
