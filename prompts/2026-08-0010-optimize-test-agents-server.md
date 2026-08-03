[x] by OpenAI Codex `gpt-5.6-luna` thinking `max` (ChatGPT account) - Implementation ~$1.58 an hour; Testing 19 minutes

[✨📭] Optimize and speed up the `npm run test-app-agents-server`

-   Now it takes extremely and unacceptably long amount of time to run the tests or the build of the agent server itself
-   Also when installing or updating the agent server, it takes extremely long.
-   The goal is to reduce the time it takes to run the tests, build, and install/update the agent server without removing functionality or degrading the quality of the tests.
-   But do not degrade the quality of the tests.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](changelog/_current-preversion.md)
