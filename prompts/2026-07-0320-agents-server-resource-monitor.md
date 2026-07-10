[ ] !!

[✨🎨] Create a resource monitor page

-   For the super admin create a resource monitor page in the Agents server on `/admin/resource-monitor` which shows the current resource usage of the server, including CPU, memory, disk space, and network usage.
-   When the server is running low on resources, show a ⚠ warning alongside the menu item message simmilar to for example when Shibboleth is not configured properly, so that the super admin can take action to free up resources or scale the server.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
