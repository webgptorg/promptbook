[x] ~$0.4478 29 minutes by OpenAI Codex `gpt-5.3-codex`

[✨🍉] Remove `WALLET` commitment

-   Remove commitments `WALLET` / `WALLETS`
-   Using the commitments `USE EMAIL` or `USE PROJECT` should be sufficient for the agents to access the wallet
-   By using the commitments `USE EMAIL` or `USE PROJECT` the wallet items will be automatically accessible for the agents, without the need to explicitly specify the `WALLET` commitment
-   Keep in mind that you are not removing the wallet functionality, you are just removing the unnecessary commitment
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[x] ~$1.18 an hour by OpenAI Codex `gpt-5.3-codex`

[✨🍉] Wallet items should be scoped per Agent

-   In the wallet there are stored credential which are used by the agents to authenticate to the external services.
-   Now all the wallet items in the wallet are scoped per logged User
-   Doesn't make logical sense. The credentials should be connected to the agent by default
-   Full options should be:
    -   Scope per User _(current implementation)_
    -   Scope per Agent _(new implementation, should be default)_
    -   Both scopes, per User and per Agent can be combined together or unused (=global wallet items for entire server instance)
    -   Default state _(when the agent is trying to access/create new the wallet item)_ should be scope per Agent
    -   In the wallet admins can change the scope of the wallet item, but by default it should be scoped per Agent
    -   Agent should have ability to change or even access the scope _(this is different than memories, where the agent can decide if the memory should be global or scoped)_
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of wallet and commitment `USE EMAIL` and commitment `USE PROJECT` before you start implementing.
-   For inspiration look how `MEMORY` is implemented
-   You are working with the [Agents Server](apps/agents-server)
-   Do the database migration for this change
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[ ] !

[✨🍉] Create credential chips

-   When the agent is using the credential from the wallet, it should be visible in the message as a chip with the name of the credential, and when you click on it, it should show the details of the credential
-   Do not expose the secret values of the credentials in the chip, but only the name and maybe some metadata
-   The popup from a chip should be UX and UI friendly for non-technical users, so they can easily understand what credential is being used and what it is for
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of the wallet and commitment `USE EMAIL` and commitment `USE PROJECT` and show the chips below the messages work before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)

---

[-]

[✨🍉] qux

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🍉] qux

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)


