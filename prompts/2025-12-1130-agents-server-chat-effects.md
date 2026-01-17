[ ] !!

[✨🚫] Add chat interactive animations

-   Show animated effects when some emojis occur in the chat.
-   For example, when user sends a message with "🎉" emoji, show confetti animation on the chat screen.
-   Do it for these emojis:
-   🎉 - confetti animation
-   ❤ (or any heart emoji) - floating hearts animation
-   Decouple the animations and effects logic from the chat component to keep the code clean. Be aware of following best practices to separate concerns.
-   Each chat effect should be implemented as a separate component that can be easily extended in the future.
-   Each effect component should handle its own rendering and cleanup.
-   Each effect should have some unique effect, for example confetti should have particles falling from the top, hearts should float up from the bottom,...
-   It shoudld be easyly extendable for future effects.
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Effects are part of the agents server, Chat component should only recieve the EffectsSystem as a prop
    -   All the assets (like images) should in public folder of the agents server app
-   You are working with the [<Chat/>](./src/book-components/Chat/Chat/Chat.tsx) component.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

**Context:**

-   **Promptbook Engine vs. Agent Server** sre two distinct parts you should know the difference:
    -   **Promptbook Engine** is the core engine that powers AI agents, it is located in `./src` folder. It is framework-agnostic and can be used in different applications. It can run as standalone javascript/typescript library, CLI environment, or be integrated into different applications. It can be also runned in Agent Server:
    -   **Agent Server** is a specific application that uses the Promptbook Engine to provide a web and API interface for creating and interacting with AI agents. It is located in `./apps/agents-server` folder.

---

[-]

[✨🚫] brr

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🚫] brr

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🚫] brr

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`
