[x] ~$0.3670 an hour by OpenAI Codex `gpt-5.5`

[✨🖖] Do not show some bullshit temporary message but real progress of the agent

-   Show what the agent is doing in real time, what step it is on, what it is thinking, what actions it is taking, what results it is getting, etc.
-   Show the internal thinking process of the agent, so that the user can understand how the agent is working and what it is doing
-   But do not expose the technical details that are not relevant for the user
-   It should be shown in a user-friendly way, so that the user can easily understand it and follow it
-   For example ChatGPT shows the thinking process of the agent in a very user-friendly way, with clear steps and explanations, but it does not show the technical details of how the agent is working under the hood
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[x] (2 attempts) $0.1676 an hour by Claude Code

---

[x] ~$0.5495 2 hours by OpenAI Codex `gpt-5.5`

[✨🖖] Do not show some bullshit temporary message but real progress of the agent

-   Show what the agent is doing in real time, what step it is on, what it is thinking, what actions it is taking, what results it is getting, etc.
-   Show the internal thinking process of the agent, so that the user can understand how the agent is working and what it is doing
-   Show just one thing at a time, do not show some complex steps or other things that are not relevant for the user, just show what is happening at a time
-   Show what is the harness doing at a time
-   But do not expose the technical details that are not relevant for the user
-   It should be shown in a user-friendly way, so that the user can easily understand it and follow it
-   For example ChatGPT shows the thinking process of the agent in a very user-friendly way, with clear steps and explanations, but it does not show the technical details of how the agent is working under the hood
-   Show the progress as follows:
    1. Randomly cycle through THINKING_MESSAGES
    2. Then show live output of the harness, not the technical details, just the output of the harness, like "Running action X", "Action X completed", "Running action Y", "Action Y completed", etc.
    3. Finally, show the final answer
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[x] $5.73 2 hours by Claude Code
[x] ~$0.3999 an hour by OpenAI Codex `gpt-5.5`

---

[x] ~$0.2437 2 hours by OpenAI Codex `gpt-5.5`

[✨🖖] Remove "Working on your request" from response

-   Show the progress as follows:
    1. Randomly cycle through `THINKING_MESSAGES` **<- Keep this until 3. final message is ready**
    2. "The local agent runner has the request and is working on the answer." **<- Remove this, it is bullshit and does not show any real progress**
    3. Finally, show the final answer
-   You are working with the [Agents Server](apps/agents-server)

