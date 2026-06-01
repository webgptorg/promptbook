[-]

[✨🧀] bar

```shell
root@collboard-agents-server-x21:~# sudo curl -fsSL https://raw.githubusercontent.com/webgptorg/promptbook/refs/heads/main/other/vps/install.sh | bash

... Installation logs ...


Hit:2 http://mirrors.digitalocean.com/ubuntu noble-updates InRelease                                                             
Hit:3 http://mirrors.digitalocean.com/ubuntu noble-backports InRelease                                                           
Get:4 http://security.ubuntu.com/ubuntu noble-security InRelease [126 kB]                                                        
Hit:5 https://repos.insights.digitalocean.com/apt/do-agent main InRelease                                                        
Hit:6 https://repos-droplet.digitalocean.com/apt/droplet-agent main InRelease
Get:7 http://security.ubuntu.com/ubuntu noble-security/main amd64 Packages [1704 kB]
Get:8 http://security.ubuntu.com/ubuntu noble-security/main Translation-en [268 kB]
Get:9 http://security.ubuntu.com/ubuntu noble-security/main amd64 Components [42.5 kB]
Get:10 http://security.ubuntu.com/ubuntu noble-security/universe amd64 Packages [1192 kB]
Get:11 http://security.ubuntu.com/ubuntu noble-security/universe Translation-en [230 kB]
Get:12 http://security.ubuntu.com/ubuntu noble-security/universe amd64 Components [74.2 kB]
Get:13 http://security.ubuntu.com/ubuntu noble-security/multiverse Translation-en [9000 B]
Fetched 3647 kB in 8s (452 kB/s)                            
Reading package lists... Done
E: Could not get lock /var/lib/dpkg/lock-frontend. It is held by process 1293 (unattended-upgr)
N: Be aware that removing the lock file is not a solution and may break your system.
E: Unable to acquire the dpkg frontend lock (/var/lib/dpkg/lock-frontend), is another process using it?
```

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)
