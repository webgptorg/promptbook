[ ]

[✨🎯] `MockedChat` should have more natural flow of messages

-   Now the `MockedChat` emulates a chat with multiple agents, but the flow of messages is not very natural
-   Make the flow more natural:
    -   Do not keep the constant rate of typing and message sending, more natural scenario is sometimes to pause for a while, then type a message quickly, then pause again
    -   Also next message, especially from the different agent, should be sometimes after a longer pause, the agent needs to "think" before typing
-   All of theese new natural flow features should be configurable and passable via `delayConfig` prop
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨🎯] Make multiple predefined `delayConfig` values for `MockedChat`

-   The `NORMAL_FLOW` should be the default option _(the current one)_
-   Add `FAST_FLOW` and `SLOW_FLOW` options
-   Add `BLOCKY_FLOW` option which wont type character by character, but will show the message only when its fully typed
-   Add `RANDOM_FLOW` option which will randomize the delays between messages and typing
-   All the constants should be exported from `@promptbook/components`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨🎯] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨🎯] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`
