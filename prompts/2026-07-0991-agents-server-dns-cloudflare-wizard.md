[ ] !!!

[✨⛈] Unite the DNS configuration manuals across the agents server

-   The DNS configuration manuals are currently scattered across multiple pages and components, which is confusing for the admins.
-   All the informations must be in `/superadmin/servers`
-   Partial information _(but in same component and the wizard)_ can be on subpages, for example email configuration `/admin/email-server`
-   On the `/superadmin/servers` page must be way how to setup ALL the DNS records for the server, including servers, projects, emails,... from single Cloudflare wizard or single manual, not from multiple manuals and pages.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
    - There should be only one component for DNS records configuration, not multiple components with different visuals and functionality on different pages.
    - But this component can show only a subset of DNS records. For example, on the email server page, you can show only email-relevant DNS records, on the Projects page, you can show only the project DNS records, etc. 
    - But on the server's page, show all the DNS records which are required for the server to be fully configured, and allow configuring them with one click by putting the Cloudflare API key. 
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

![`/superadmin/servers` page](screenshots/2026-07-0991-agents-server-dns-cloudflare-wizard.png)
![`/admin/email-server` page](screenshots/2026-07-0991-agents-server-dns-cloudflare-wizard-1.png)
