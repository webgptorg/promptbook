[x] (2 attempts) ~$0.00 an hour by GitHub Copilot `gpt-5.4`

[✨🈺] Show when the DNS isn't set up properly and instructions on how to set it up properly.

-   When you add a new domain, everything should be set up automaticaly, nginx configuration, SSL certificate, and so on, but in some cases, there can be issues with the DNS configuration of the domain, for example, if the user forgets to add the CNAME record for the domain, or if there is some issue with the DNS provider, and in these cases, the Agents server should show a clear message to the user that there is an issue with the DNS configuration of the domain, and also show instructions on how to set it up properly, for example, show the required CNAME record that needs to be added to the DNS configuration of the domain, and also show a link to a guide on how to do it for different DNS providers
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server) with page `/admin/servers`

**This is how the Agents server is installed:**

```bash
root@collboard-agents-server-x21:~# sudo curl -fsSL https://raw.githubusercontent.com/webgptorg/promptbook/refs/heads/main/other/vps/install.sh | bash
```

