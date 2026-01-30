[x] ~$1.58

[✨📰] Show that the GPT assistant is pending in UI

When the agent has a very huge book, the duration of the creation of the underlying GPT assistant is pretty long. It can take, for example, multiple minutes of waiting. This has terrible user experience because the user is waiting and waiting and waiting for the first response.

Make some look how the chips or tool chips are implemented. For example, how it looks when the agent is using a source engine, or when the agent is self-learning, or when the agent is doing some job and create similar mechanism, but not during the call and after call like a self-learning, but before the call. This chip should show something like "Preparing" or "Creating agents", and the user should clearly see that something is happening. They should see that "Oh, now I'm in the phase when the agent is preparing this". This will happen once, and then the GPT assistant is created. At the second call, the preparation won't show because the agent is already cached, but the UI will be much better.

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[x] ~$1.57

[✨📰] When the agent is being prepared, log more info.

-   The operation of the underlying OpenAI assistant can take multiple minutes.
-   During this time, it would be great to log more info about what is happening under the hood.
-   Mark logs with some special tag like `console.info('[🤰]',...)`
-   We need to get your info for making this process much quicker because the current speed is unacceptable.
-   You are not optimizing this process. You are now just logging what is happening in this process.
-   You can also report it into the chip "... Preparing agent..." on the UI If it doesn't require making some substantial changes.
-   You are working with the [Agents Server](apps/agents-server)

![alt text](prompts/screenshots/2026-01-0460-agents-server-pending-creating-assistant.png)
![alt text](prompts/screenshots/2026-01-0460-agents-server-pending-creating-assistant-1.png)

---

[-]

[✨📰] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨📰] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

