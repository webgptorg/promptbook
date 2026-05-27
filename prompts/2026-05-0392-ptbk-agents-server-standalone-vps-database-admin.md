[ ] !!!

[✨🤬] Add build in database admin into Agents server for super `admin`

```bash
root@collboard-agents-server-x21:~# sudo curl -fsSL https://raw.githubusercontent.com/webgptorg/promptbook/refs/heads/main/other/vps/install.sh | bash
```

-   _(@@@ wait until `2026-05-0391-ptbk-agents-server-standalone-vps-script-configuration-throught-ui-and-servers.md` is ready)_
-   Use Embedded Prisma Studio as the database admin interface
-   Database admin should allow to manage both SQLite and Supabase databases
-   Allow both editing and viewing the database
-   The Agents server is working with table prefixes, the database admin should show all the tables as they are in the database
-   You are adding raw access to the database not app-specific access, so the database admin should show all the tables and allow to edit them as they are in the database, without any abstraction or hiding of the tables, so the user can see and edit the tables as they are in the database, with their prefixes and all
-   Database admin should be accessible from the menu "System" -> "Super Admin" -> "Database"
-   There are 3 levels of permissions for the users in the Agents server:
    -   Super `admin` - can access the database admin
    -   Normal `admin` - cannot access the database admin and even does not see the "Database" menu item
    -   Normal user - cannot access the database admin and even does not see the "Super Admin" menu
-   Keep in mind the DRY _(don't repeat yourself)_ principle
-   You are working with the [Agents Server](apps/agents-server)
-   You are working with [auto installation script](vps/install.sh)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
