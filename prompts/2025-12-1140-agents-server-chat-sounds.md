[ ] !

[✨⬇️] Add chat sounds

-   Add sound effects to the chat component for better user experience.
-   The sounds should be gentle and not annoying.
-   Use the following sounds:
    -   A soft "ding" sound when a new message is received from the agent.
    -   A subtle "whoosh" sound when the user sends a message.
    -   A light "tap" sound when the user clicks on buttons within the chat.
    -   Typing indicator sound when the agent is "Thinking..." the response.
-   Ensure the sounds are not too loud and can be muted by the user.
-   Add an option in the chat settings to enable/disable sounds in the menu saved in local storage.
-   Decouple the sound playing logic from the chat component to keep the code clean. Be aware of following best practices to separate concerns.
-   Also add sound effects to chat effects triggered by emojis (like confetti and hearts).
-   Effects should be using sound system like the external component, keep in mind scalability for future effects and decouple the logic.
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Sounds are part of the agents server, Chat component should only recieve the SoundSystem as a prop
    -   All the assets (like mp3 files) should be in the public folder of the agents server app
    -   This should be pluggable to all the <Chat/> components like <AgentChat/>, <LlmChat/>, <MockedChat/>,... and should work samely in all of them
-   You are working with the [<Chat/>](./src/book-components/Chat/Chat/Chat.tsx) component.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

**Context:**

-   **Promptbook Engine vs. Agent Server** sre two distinct parts you should know the difference:
    -   **Promptbook Engine** is the core engine that powers AI agents, it is located in `./src` folder. It is framework-agnostic and can be used in different applications. It can run as standalone javascript/typescript library, CLI environment, or be integrated into different applications. It can be also runned in Agent Server:
    -   **Agent Server** is a specific application that uses the Promptbook Engine to provide a web and API interface for creating and interacting with AI agents. It is located in `./apps/agents-server` folder.

---

[-]

[✨⬇️] foo

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨⬇️] foo

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨⬇️] foo

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`
