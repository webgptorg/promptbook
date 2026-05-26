[ ] !!!!!

[✨🤬] Allow to configure the installed Agents server on VPS throught UI when logged in as `admin`

**This is how Agents server is installed:**

```bash
root@collboard-agents-server-x21:~# sudo curl -fsSL https://raw.githubusercontent.com/webgptorg/promptbook/refs/heads/main/other/vps/install.sh | bash
Coding runner [github-copilot]:
Runner model [gpt-5.4]:
Runner thinking level [xhigh]:
Agents Server port [4440]:
Custom domain(s), comma-separated []: s21.ptbk.io
[promptbook-vps] Before SSL is issued, point these DNS records to this VPS:
[promptbook-vps]   s21.ptbk.io  A  165.245.252.161
[promptbook-vps] If your VPS provider gave you an IPv6 address, add matching AAAA records as well.
Have the DNS records propagated and should SSL setup continue now? [yes]: s21.ptbk.io,s21-1.ptbk.io
...
... Installation ...
```

-   Allow to skip all the values and configure them later through the UI if it's possible.
-   All the options configured during the installation should be also configurable later through the wizzard on IP address when there is no domain configured, and also through the UI when logged in as super `admin`
-   When no domain is added during the installation, the server should be still accessible on `http://<IP_ADDRESS>` and then the domain can be added later through the UI
-   Port `4440` is just internal for proxiing, Nginx should expose port `80` from raw IP adress
-   When accessing IP address without domain, it should show one of 3 things:
    -   If there is no domain configured, it should show a login where only super `admin` can log in, and after logging in it should go through the wizzard of configuration of the server, reuse the components, logic and the code from the installation script, and UI
        -   Prefer configuring single domain during the installation, adding multiple domains should be advanced option
    -   If there is one domain configured, it should redirect to that domain to `https`
    -   If there are multiple domains configured, it should show a simple page where you can choose to which domain you want to go
-   Never accessing the server on different ports than `80` or `443`, port `4440` should be just internal for proxiing, and never be exposed to the public, Nginx should expose port `80` from raw IP adress, and `443` for each domain
-   Allow to re-configure all the values later through the UI, especially changing the servers and domains
-   Obtain the SSL certificates when the domain is added through the UI.
    -   It shouldn't matter if the domain is added through UI or installation script. In any case, auto-obtain the certificates, configure Nginx, Database. Migrations,..., and do everything to get the server to work on that domain.
    -   Also show when the DNS isn't set up properly and instructions on how to set it up properly.
-   Allow to edit environment variables through admin UI, there are 2 types of environment variables:
    -   1. Environment variables in `.env` file, they should be viewable through "System" -> "Super Admin" -> "Environment variables", BUT hide all the sensitive variables, they are global for entire VPS
    -   2. Metadata, which is stored in the database, they should be editable through "System" -> "Administration" -> "Metadata" and are specific for each domain configured in `SERVERS`
    -   Share the UI components and patterns between 1. and 2.
    -   Also there should be 3 tabs connecting "Environment variables", "Metadata" and "Limits"
-   Servers editing or editing environment variables editing should be possible only for the super `admin`, whose password is configured via `ADMIN_PASSWORD`
-   Viewing environment variables or servers should be possible for normal administrators, but editing should be only possible for super `admin`, just never allow to read sensitive environment variables like `OPENAI_API_KEY` for anyone through the UI, super `admin` can just edit it if needed which will be reflected in the `.env` file, but it should not be visible in the UI for anyone, including super `admin`
-   Move Servers item in menu from "System" -> "Administration" -> "Servers" to "System" -> "Super Admin" -> "Servers"
-   There are 3 levels of permissions for the users in the Agents server:
    -   Super `admin` - can edit servers, can edit environment variables, can view environment variables (but hide sensitive ones), can edit metadata, can view metadata, can edit limits, can view limits, everything in "Super Admin" section
    -   Normal `admin` - cannot edit servers, cannot edit environment variables, can view environment variables (but hide sensitive ones), can edit metadata, can view metadata, can edit limits, can view limits, view "Super Admin" section, edit "Administration" section
    -   Normal user - can access just "My Account" _(which is created ad-hoc for anonymous users)_ and "Legal & About" but nothing edit
-   By hiding environment variables in the UI I mean showing \* stars instead of the value
-   Keep in mind the DRY _(don't repeat yourself)_ principle, especially logic between the installation script and the changes which you can do in the UI or later in the UI. For each thing, there should be just one code, which is just run from a different context one time from the installation script, and one time from the UI.
-   Formally, the administration of the servers was calling Vercel API adding domains. This should be abandoned because we are not using Vercel anymore but VPS with Nginx and Certbot
-   Also add "System" -> "Super Admin" -> "Logs" where super `admin` can see the logs of the server from `pm2 logs`
-   Also add "System" -> "Super Admin" -> "Code runners" where super `admin` can log in into the code runners like Github Copilot, OpenAI Codex, Claude codem,...
    -   This should be configurable both throught the installation script, the wizzard on IP address when there is no domain configured, and also through the UI when logged in as super `admin` in "System" -> "Super Admin" -> "Code runners"
    -   Also share the code and logic between the installation script and the UI, so you are not repeating yourself, but just running the same code from different contexts
    -   Eqivalent step in installation script is `Open GitHub Copilot CLI now for /login and project trust setup? [yes]:`
-   You are working with the [Agents Server](apps/agents-server)
-   You are working with [auto installation script](vps/install.sh)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
-   You can update the [documentation](AGENTS.md) if needed

![alt text](prompts/screenshots/2026-05-0391-ptbk-agents-server-standalone-vps-script-configuration-throught-ui-and-servers.png)
![alt text](prompts/screenshots/2026-05-0391-ptbk-agents-server-standalone-vps-script-configuration-throught-ui-and-servers-1.png)
