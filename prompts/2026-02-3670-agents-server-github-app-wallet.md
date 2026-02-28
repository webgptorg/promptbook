[x] ~$0.00 32 minutes by OpenAI Codex `gpt-5.3-codex`

[✨🐏] Integrate Github app

-   When using `USE PROJECT` it will ask for the Github token
-   This is not very user friendly, because needs to manually ask for the token and copy paste it into the wallet. Instead, the Github app should be integrated into the Agents Server, so when the user uses `USE PROJECT` it will automatically use the Github app to authenticate and get the token for the user, without the need for the user to manually copy paste the token.
-   This will still add a token into the wallet, but it will be done automatically without the need for the user to do it manually.
-   Keep the option of manually editing the token in the wallet, because some users might want to use their own token with more permissions or different account. You are not removing the option to manually add the token into the wallet, you are just adding an option to automatically get the token from the Github app when using `USE PROJECT`.
-   Add option to connect with the github in the wallet page.
-   The Github app should be in `.env` file of the Agents Server
-   Write me instructions how to create the Github app and get the token for it, and add it into the documentation of the Agents Server into `./GITHUB_APP.md`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
    -   The popup when the Github app is not connected from a chat and the wallet should be the same, so you should reuse same code.
-   Do a proper analysis of the current functionality of `USE PROJECT` and wallet before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🐏] brr

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🐏] brr

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🐏] brr

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

