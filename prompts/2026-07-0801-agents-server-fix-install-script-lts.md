[x] (2 attempts) ~$0.6582 4 hours by OpenAI Codex `gpt-5.5`

[✨🏜] Add option to pick environment to `install.sh` script

-   Install script installs Agents server on VPS and it should be possible to pick the environment (`live`, `preview`, `production`, `lts`)
-   By default it should install `preview` environment, but it should be possible to pick `live`, `production` or `lts` environment with `--env` option
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server) install script

```console
root@collboard-ptbk-lts:~# sudo curl -fsSL https://raw.githubusercontent.com/webgptorg/promptbook/refs/heads/main/other/vps/install.sh | bash -s -- \
    --non-interactive \
    --yes-i-understand-that-script-should-be-run-on-fresh-server \
    --env lts \
    --domain lts.ptbk.io \
    --openai-api-key sk-proj-xxx \
    --admin-password xxx
```

