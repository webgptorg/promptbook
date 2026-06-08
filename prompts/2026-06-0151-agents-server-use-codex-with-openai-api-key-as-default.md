[x] ~$0.00 an hour by OpenAI Codex `gpt-5.5`

[✨🐄] Use openai-coder with api key as configured agent runner

-   If the user enters the OpenAI API key during the installation process, then the openai-coder runner should be configured with that API key
-   All of the runners should be available, just the default behavior should be that if the user enters the OpenAI API key during the installation process, then the openai-coder runner should be configured with that API key instead of asking in interactive mode to setup the login

**This is how the Agents server is installed:**

```bash
root@collboard-agents-server-x21:~# sudo curl -fsSL https://raw.githubusercontent.com/webgptorg/promptbook/refs/heads/main/other/vps/install.sh | bash
```

