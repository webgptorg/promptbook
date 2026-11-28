[x] ~$0.00 an hour by OpenAI Codex `gpt-5.3-codex`

[✨🤩] Make `WALLET` commitment

**For example the agent:**

```book
Copywriter Bot

USE BROWSER
USE PROJECT https://github.com/hejny/test
PERSONA You are a copywriter
WALLET Store All information
```

Has the ability to use a browser and look at a GitHub project, so it needs access to the private places, and this access should be stored somewhere.
And this is exactly the purpose of the wallet: storing the private information which can be accessed by the agent(s).

-   Records into the wallet can be added via these three ways:
    1. agent will create its own login or API key and put it into the wallet.
    2. user adds it manually when the agent needs it, for example when the agent needs a login for Facebook. He can request credential info for Facebook, and the user will see a pop-up to put it there during the conversation.
    3. the wallet will be in the settings, similarly to the memory.
-   There will be several types of wallet records:
    1. usernames and passwords
    2. session cookies
    3. access tokens, api keys
-   The wallet item can be scioped to a specific agent, or it can be global for all agents on the server, similarly to the memory.
-   For example token from `USE PROJECT` should be stored securely by the wallet, change the mechanism of `USE PROJECT` to get the token from the wallet, and if it is not there, ask the user to put it there. instead of storing it in the browser as it is now.
-   There is a generic pattern for the commitments: there is a commitment keyword like `WALLET` and then follows additional instructions. Keep this pattern also here. The additional instructions are here only additional for what keys to store. For example, during the browsing of the internet.
-   Do a proper analysis of the current functionality (how commitments works, how memory works) before you start implementing.
    -   This is a bit similar to a commitment to the `MEMORY`, Use the similar patterns.
-   Do a database migration to add a new table for the wallet records.
-   For now, store the wallet records in unencrypted state. In the future, encryption will be added.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[ ]

[✨🤩] Wallet enctyption

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🤩] brr

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🤩] brr

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

