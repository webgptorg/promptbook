[x]

[✨🏃] Allow to pause `MockedChat`

-   Add prop `isPausable?: boolean;` into `MockedChatProps`
-   When pausable, show a "Pause" button alongside the "New chat" button
-   When pause pressed, change the state to "Pausing" and finish the current message, then stop showing new messages until "Resume" button is pressed
-   By default, `isPausable` should be `true`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[x]

[✨🏃] Enhance UI and UX of `MockedChat`

-   Add icon, opacity and color to the pause button to enhance the UI and UX of pausing
-   Hide pause button when chat is ended _(then you can reset it but this is separate responsibility you are not touching here)_
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[x]

[✨🏃] Allow to hide/show "New chat" button in `MockedChat`

-   Add prop `isResettable?: boolean;` into `MockedChatProps`
-   When resettable, keep the current state, when false, hide the "New chat" button
-   By default, `isResettable` should be `true`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[-]

[✨🏃] quux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[-]

[✨🏃] quux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`
