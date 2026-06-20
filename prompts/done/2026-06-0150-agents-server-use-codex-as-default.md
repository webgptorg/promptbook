[x] ~$0.3949 an hour by OpenAI Codex `gpt-5.5`

[✨🐄] Use openai-coder as default runner instead of github-copilot when in VPS install script

-   All of the runners should be available, just the default one should be openai-codex instead of github-copilot which is default now

**This is how the Agents server is installed:**

```bash
root@collboard-agents-server-x21:~# sudo curl -fsSL https://raw.githubusercontent.com/webgptorg/promptbook/refs/heads/main/other/vps/install.sh | bash
```

