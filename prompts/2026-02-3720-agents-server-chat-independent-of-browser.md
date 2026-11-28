[x] by Claude Code but stucked - _not working_
[x] ~$0.5071 24 minutes by OpenAI Codex `gpt-5.3-codex` - _not working, appended to the previous commit_
[x] ~$1.45 an hour by OpenAI Codex `gpt-5.3-codex` - _not working; all again_
[x] ~$0.4550 29 minutes by OpenAI Codex `gpt-5.3-codex` - _not working; all again_

---

[ ] !

[✨🍅] Chat should be independent of the browser.

-   _(@@@ Waiting for the stronger Agent to do the job)_
-   Chat should be idependent of the focus and the browser window. It should not matter whether the user is looking on the chat or not, whether he has it opened in one or more browser windows, whether he refreshes the page during the streaming of the agent response, etc. The agent response should be put into the chat independently of all these factors.
-   For example `https://pavol-hejny.ptbk.io/agents/WW1PUgLKjAUvge/chat?chat=zrNE5PVhizs61c`
    -   The `WW1PUgLKjAUvge` is id of the agent
    -   The `zrNE5PVhizs61c` is id of the chat
    -   Each chat is flowing independently of the browser, one agent can have multiple chats and each of them are independent separatelly
-   Consider theese scenarios:
    1. User opens the chat and asks something to the agent, the agent starts responding, user keeps the chat opened in the browser until the agent finishes the response, and then user sees the agent response in the chat. This is standard scenario, and it is working already well, keep it working as well as you implement the new functionality, do not break this scenario.
    2. When user refreshes the page, chat should not be lost, the agent response should be put into the chat even if the user is refreshing the page during the streaming of the response.
        - This should work in all stages of the agent response, during the thinking, during the streaming of the response, and after the response is finished.
    3. When user has multiple opened windows with the same chat, the response should be put into the chat in all windows, and it should not matter whether the user is focused on one of them or not.
    4. Same as (3) with multiple independent devices, if the user is looking on the same chat from two different devices, this chat should be synchronized and the agent response should be put into the chat in both devices independently of whether the user is focused on one of them or not.
    5. When the user goes offline and then online again, the chat should be synchronized and the agent response should be put into the chat when the user goes online again, even if the user was offline during the streaming of the response.
-   Experience must be smooth and seamless, the user should not have to do any manual refreshes or actions to see the agent response in the chat, it should be automatic and seamless without blinks or refreshes, and it should work in all the scenarios mentioned above.
-   Agents server can run on serverless environment (like Vercel) and it should not rely on any in-memory state, all the state should be stored in the database and the chat should be flowing independently of the browser and the user connection.
-   Also it can be impossible to use web sockets for the chat synchronization, implement this just the simple http requests from the client to the server to fetch the new messages and update the chat, without any web sockets or real-time connections, just simple polling from the client to the server to fetch the new messages and update the chat.
-   It doesn’t need to be real-time like a game, sync interval of 5 seconds is good enough for the chat synchronization.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of chats and agents before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it

---

[-]

[✨🍅] brr

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🍅] brr

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🍅] brr

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)
