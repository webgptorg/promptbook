[ ]

[✨👥] Fix the OpenAI Codex authentication

-   On `/admin/harness-auth` there is option to sign in to harness like OpenAI Codex to use the subscription instead of API key
-   But currently this is not working, you can not use it to sign in to the OpenAI Codex harness, it is not working
- It should do `codex login --device-auth`
- It should be a wizard for the admin who doesn't know how to do it
- Explainn difference between the API key and the subscription via the OpenAI Codex harness
- Also show which option is currently used, the API key or the OpenAI Codex harness
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)




```console
[promptbook-vps] Starting interactive authentication for runner 'openai-codex' in /opt/promptbook-agents-server.
                                                                                                                [promptbook-vps] Complete any login or project-trust prompts in the browser terminal and exit the runner CLI when finished.

                                                                                    Session terminated, killing shell...


```