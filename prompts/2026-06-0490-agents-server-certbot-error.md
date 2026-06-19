[ ]

[✨𓀚] When the certbot fails, show it

-   Now when the certbot fails, it shows nothing just https on the installed server isnt working, and the user has no idea what happened
-   Look at `prompts/2026-06-0490-agents-server-certbot-error.log`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server) installed by the install.sh script

**This is how the Agents server is installed:**

```bash
root@collboard-agents-server-x21:~# sudo curl -fsSL https://raw.githubusercontent.com/webgptorg/promptbook/refs/heads/main/other/vps/install.sh | bash
```

**This is the `/etc/nginx/sites-available/promptbook-agents-server` file on installed VPS:**

```
map $http_upgrade $promptbook_connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 100m;
    include /etc/nginx/snippets/promptbook-agents-server-errors.conf;

    location ^~ /_next/static/ {
        root /opt/promptbook-agents-server/.promptbook/next-static;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        try_files $uri @promptbook_agents_server_next_static;
    }

    location @promptbook_agents_server_next_static {
        include /etc/nginx/snippets/promptbook-agents-server-proxy.conf;
    }
    # [✨🏣] Hash-based file URLs (format: /s3/{hex}/{hex}/{sha256-64-chars}/{filename})
    # are served by Next.js which proxies to VersityGW internally, so the internal
    # bucket name and path prefix are never exposed in the public URL.
    location ~ ^/s3/[0-9a-f]/[0-9a-f]/[0-9a-f]{64}/ {
        include /etc/nginx/snippets/promptbook-agents-server-proxy.conf;
    }

    location /s3/ {
        proxy_pass http://127.0.0.1:10000/;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_redirect off;
        proxy_hide_header Server;

        proxy_set_header Host 127.0.0.1:10000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    location / {
        include /etc/nginx/snippets/promptbook-agents-server-proxy.conf;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name s24-1.ptbk.io;

    client_max_body_size 100m;
    include /etc/nginx/snippets/promptbook-agents-server-errors.conf;

    location ^~ /_next/static/ {
        root /opt/promptbook-agents-server/.promptbook/next-static;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        try_files $uri @promptbook_agents_server_next_static;
    }

    location @promptbook_agents_server_next_static {
        include /etc/nginx/snippets/promptbook-agents-server-proxy.conf;
    }
    # [✨🏣] Hash-based file URLs (format: /s3/{hex}/{hex}/{sha256-64-chars}/{filename})
    # are served by Next.js which proxies to VersityGW internally, so the internal
    # bucket name and path prefix are never exposed in the public URL.
    location ~ ^/s3/[0-9a-f]/[0-9a-f]/[0-9a-f]{64}/ {
        include /etc/nginx/snippets/promptbook-agents-server-proxy.conf;
    }

    location /s3/ {
        proxy_pass http://127.0.0.1:10000/;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_redirect off;
        proxy_hide_header Server;

        proxy_set_header Host 127.0.0.1:10000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    location / {
        include /etc/nginx/snippets/promptbook-agents-server-proxy.conf;
    }
}

```
