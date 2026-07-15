[x] ~$0.4243 an hour by OpenAI Codex `gpt-5.5`

---

[x] $4.25 7 hours by Claude Code `claude-opus-4-8`

[✨😺] If the codex is logged in to the ChatGPT account on the server. Use this ChatGPT account, not the token usage via the API key.

```console
root@collboard-ptbk-preview:~# codex login status
Not logged in
```

<- In this situation the codex is not logged in to the ChatGPT account on the server. Use the token usage via the API key. _(this is currently working as expected)_

```console
root@collboard-agents-server-x24:~# codex login status
Logged in using ChatGPT
```

<- In this situation the codex is logged in to the ChatGPT account on the server. Use this ChatGPT account, not the token usage via the API key.

-   You are working with the [Agents Server](apps/agents-server)
-   Show wheather the codex was used via the ChatGPT account or API key in the task details
-   Show also the usage in the task details
-   Keep in mind the DRY _(don't repeat yourself)_ principle, reusen the existing code for computing the usage and displaying the usage

