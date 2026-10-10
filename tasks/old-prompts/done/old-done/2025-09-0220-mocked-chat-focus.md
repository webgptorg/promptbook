[x]

[✨💆] `MockedChat` should keep most recent message visible

-   The component should automatically scroll to the most recent message when a new message is added
-   When user takes an action, the component should stop auto-scrolling unitl user scrolls back to the bottom
-   This mechanism should be working for both <MockedChat/> and <LlmChat/> and <Chat/>
-   On every new message, the component should check if the most recent message is visible
    -   If yes, and already at the bottom, it should stay at the bottom and scroll with new messages
    -   If not, it should show a small "Scroll to bottom" button
-   This mechanism is already implemented in but revive it and make sure that it works properly in all the chat components
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[-]

[✨💆] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[-]

[✨💆] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[-]

[✨💆] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`
