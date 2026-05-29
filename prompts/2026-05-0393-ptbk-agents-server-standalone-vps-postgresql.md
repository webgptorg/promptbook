[x] ~$0.00 44 minutes by GitHub Copilot `gpt-5.4`

[✨🤬] Add support for PostgreSQL in Agents server

```bash
root@collboard-agents-server-x21:~# sudo curl -fsSL https://raw.githubusercontent.com/webgptorg/promptbook/refs/heads/main/other/vps/install.sh | bash
```

-   Now the Agents server only supports SQLite and Supabase as the database, add support for PostgreSQL as well
-   When installing Agents server through auto installation script `install.sh`, allow to pick between SQLite and PostgreSQL as the database for the Agents server, by default use PostgreSQL, but if the user prefers to use SQLite, allow them to choose it during the installation process and configure the Agents server to use SQLite instead of PostgreSQL
-   Auto installation script should automatically install and configure PostgreSQL on the server if the user chooses to use PostgreSQL as the database for the Agents server, and also create a new database and user for the Agents server, and configure the Agents server to connect to the PostgreSQL database using the created user and database
-   The database settings should be stored in the `.env` file, and its one of the settings that must be configured during the installation process and cannot be setup during the UI wizzard "Create new server" or in super `admin` UI, but it is allowed just to press enter to use the default PostgreSQL configuration
-   Generate strong random password for the PostgreSQL user and store it in the `.env` file, and also show it to the user during the installation process, so they can save it if they want to access the database directly
-   Both SQLite and PostgreSQL should be supported by the build in Embedded Prisma Studio
-   Keep in mind the DRY _(don't repeat yourself)_ principle also keep in mind that there should be abstracted code for the database connection and the places of the Agents server app which are using the database
-   You are working with the [Agents Server](apps/agents-server)
-   You are working with [auto installation script](vps/install.sh)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

