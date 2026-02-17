[ ]

[✨🎺] brr

Allow to setup agent / folder / top as homepage - any URL

Agents homepage from / to /agents/
The / to the selected URL via metadata
By default /agents

-   _(@@@ Wait for stronger model)_
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
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
    - Control panel
    - User menu with the avatar and the name of the user

### My chats panel in agent profile page

-   The My chats panel in the agent chat page shows the list of chats with this agent, It is ordered by the last chat update time, and shows the name of the chat, the last message and the time of the last update.

### Database migrations for Agents server

-   Migrations are located in `/apps/agents-server/src/database/migrations`
-   Be aware that table names in migrations have prefix `prefix_` _(look at existing migrations for reference)_

### Metadata of Agents server

-   There is a table called `Metadata`
-   It has `key` and `value` fields
-   It is a similar concept to configuration, but this configuration can be changed by the administrators in the Agents server website.

### Memories vs. self-learning in Agents server

There are two similar concepts you should know and shouldn't confuse you:

-   **Self-learning** Is a capability of an agent to self-edit their source book and append new commitments.
-   **Memories** Is a capability of an agent to store some information snippets in the database connected with the user.

### Knowledge vs. attached files

There are two similar concepts you should know and shouldn't confuse you:

-   **Knowledge** Is a capability of an agent to have some `KNOWLEDGE` section in the source book.
-   **Attached files** Is a capability of an agent to read files which are attached by the user in the chat.


---

[-]

[✨🎺] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🎺] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🎺] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
