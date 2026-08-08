[x] by Claude Code `claude-opus-5` thinking `max` - Implementation $21.96 4 hours; Testing 3 minutes

[✨🔶] Create agent goal chats

-   The purpose of the goal chat is not for the user to chat with the agent, but for the agent to have its own thread and make plans by itself towards its goal.
-   The goal chat is a special chat that is created for each agent and is used by the agent to communicate with itself and the agent server during the execution of its tasks.
-   When the agent is invoked, either in the goal chat or in any other chat, one of the things the agent can do is set up a planned message for the future. This message will appear in his goal chat.
-   This planned message will wake the agent, allowing him to take actions towards his goal, do something, or plan another message.
-   Also, when the agent is created or modified, the message should be left in his goal chat.
-   This goal chat is like internal communication and thinking of the agent itself, which can lead the agent to set up the next invocation in some time.
-   In the goal chat show the planned messages with the time when they are planned to be executed. The agent can also set up a message for the future in the goal chat, which will wake him up and allow him to take actions towards his goal.
-   The agent can also list all the planned messages and cancel them any time.
-   There should be exactly one goal chat corresponding with each agent.
-   In difference with normal user chats, which can be N for each agent, goal chat is a singleton for the agent.
-   Only who can access the Agent source code book can access the goal chat.
    -   When you have access to the Goal chat, allow it to be visible among other chats. However, this chat should remain on top of the list and feature a special icon representing the goal chat.
-   Only the agent can write messages into the goal chat, so it's read-only and does not even show the input text area.
-   Show there some message about a specialty of this chat.
-   The goal chat is something like a chat that an agent does with itself.
-   This functionality is replacing the `/timeouts` - Completely remove this page And transform the functionality to the goal chat.
-   When the chat completion of the Goal Chat is done, the task should be visible as a chat completion in the Task Manager, but it should have some special type or flag to be distinguished from normal chat completion tasks which are invoked by the user.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

@@@@@@@@@@@
book update debounce

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server) with goal cgha
-   Add the changes into the [changelog](changelog/_current-preversion.md)


## ![alt text](screenshots/2026-08-0140-agents-server-goal-chat.png)

@@@@@@@@@@@
popup

![alt text](screenshots/2026-08-0140-agents-server-goal-chat.png)
