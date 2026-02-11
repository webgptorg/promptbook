[x] ~$1.05 - done but not 100%

---

[x] ~$0.29 12 minutes by OpenAI Codex `gpt-5.1-codex-mini`

[✨🏊] Remove any blocking ugly functions from the agent's server.

-   By "blocking ugly functions" we mean the following browser functions that block the main thread:
    -   `alert`
    -   `prompt`
    -   `confirm`
-   Replace them with non-blocking nice UI / UX components.
-   These should behave as nice pop-ups.
-   All of these functions should have their React component, but they should be called through the asynchronous function, which will render them inside a global context provider.
-   Make sure that these functions are accessible from anywhere in the agents server codebase.
-   Make sure that these functions are fully typed with TypeScript.
-   Make sure to handle edge cases, such as multiple calls to these functions in quick succession
-   When the multiple of these functions are called at once, show just one at a time, in the order they were called.
-   All of these modals should be cancelable when the user clicks on the "X" button or outside the modal, this should reject the promise.
-   Look at the login model and try to use the same system, Login will be just one of these functions, but more advanced case.
-   Use the Tailwind which is used in the agents server.
-   Keep in mind the DRY _(don't repeat yourself)_ principle
-   You are working with the [Agents Server](apps/agents-server), This is relevant only for the agent server everything you are doing, you are doing under `apps/agents-server`
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🏊] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🏊] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🏊] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

