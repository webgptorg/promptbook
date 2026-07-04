[x] ~$0.00 22 minutes by OpenAI Codex `gpt-5.1-codex-mini`

[✨🩴] Implement private mode.

-   In private mode, the agent should not store any information about the user in the database, including chat history, memories, and self-learning.
-   Allow to toggle private mode in the control panel
-   In private mode, also current memories cannot be accessed.
-   You will see current chat in my chats sidebar in some visually different way to be distinct as it is private.
-   This is kinda stronger than toggling of the server learning.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality, control panel, my chats, memories and self-learning before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

### The Agents Server menu

The menu of the agent server looks like this:

1. The navigation hierarchy
    - Icon and Server name _(for example Promptbook Agents Server)_
    - arrow ">" and Agents or picked agent name (organized in folders)
    - arrow ">" and the view Profile / Chat / Book of the agent or nothing if no agent is picked
2. The menu items
    - Documentation
    - System
3. Control panel and user menu
    - Control panel **<- HERE SHOULD BE THE TOGGLE FOR PRIVATE MODE**
    - User menu with the avatar and the name of the user

### Memories vs. self-learning in Agents server

There are two similar concepts you should know and shouldn't confuse you:

-   **Self-learning** Is a capability of an agent to self-edit their source book and append new commitments.**<- THIS IS NOW RELEVANT FOR THIS TASK**
-   **Memories** Is a capability of an agent to store some information snippets in the database connected with the user. **<- THIS IS NOW RELEVANT FOR THIS TASK**

---

[-]

[✨🩴] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🩴] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🩴] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
