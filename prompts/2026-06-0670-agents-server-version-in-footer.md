[x] $3.21 22 minutes by Claude Code

---

[x] $1.61 3 hours by OpenAI Codex `gpt-5.5`

[✨𓀃] In the footer of agents server there should be unique emoji heard in "Made with ❤️ in Europe"

-   Use the hash of the commit to derive the emoji
-   Do not show always "❤️" but vary the emoji based on the hash of the commit, for example "Made with 🐙 in Europe" or "Made with 🦄 in Europe"
-   Use only positive or neutral emojis, no negative or scary emoji
-   Purpose is to track the version of the server in a unique way, so that if the user sees a different emoji than before, they know that the server has been updated
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)




---

[ ] !

[✨𓀃] Modify footer of the Agents server

**Now it shows:**

```
© 2026 Promptbook
All rights reserved.
Made with ❤️ in Europe

Promptbook engine version 0.113.0-1
```

**It should show:**

```
© 2026 Promptbook
Made with ❤️ in Europe

v0.11.11-1 (1c4999b), 2 days ago
```


-  Put there the latest version tag of the server, for example `0.11.11-1`
- If the server is on newer commit than the latest version tag, show additionally the shorthash of the commit, for example `0.11.11-1 (1c4999b)`
- The version information should be linked to the git repository and should be smaller and a little bit fainter compared with other text in the footer.
-  also show how long ago the version was released based on the commit date
-  reuse the same logic and code from the self-update admin page
-  but make the rendering of the footer very lightweight. The footer is rendered every time, so it shouldn't degrade the performance of the agent server
-   Use the hash of the commit to derive the emoji
-   Do not show always "❤️" but vary the emoji based on the hash of the commit, for example "Made with 🐙 in Europe" or "Made with 🦄 in Europe"
-   Use only positive or neutral emojis, no negative or scary emoji
-   Purpose is to track the version of the server in a unique way, so that if the user sees a different emoji than before, they know that the server has been updated
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)


