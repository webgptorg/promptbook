[ ] !!!!

[✨🏜] Fix `install.sh` script

-   Install script ends with error `bash: line 3899: BASH_SOURCE[0]: unbound variable`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server) install script

```console
root@collboard-ptbk-lts:~# sudo curl -fsSL https://raw.githubusercontent.com/webgptorg/promptbook/refs/heads/main/other/vps/install.sh | bash -s -- \
    --non-interactive \
    --yes-i-understand-that-script-should-be-run-on-fresh-server \
    --domain lts.ptbk.io \
    --openai-api-key sk-proj-xxx \
    --admin-password xxx


bash: line 3899: BASH_SOURCE[0]: unbound variable
```
