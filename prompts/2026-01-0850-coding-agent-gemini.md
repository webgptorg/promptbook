[ ] !!!!

[✨🦅] Add [Gemini CLI](https://github.com/google-gemini/gemini-cli) to the [coding agent script](./scripts/run-codex-prompts/run-codex-prompts.ts)

-   There is a coding agent script at `./scripts/run-codex-prompts/run-codex-prompts.ts` which runs OpenAI Codex, Claude and other coding agents with prompts from the `./prompts` folder.
-   Add support to run prompts in [Gemini CLI](https://github.com/google-gemini/gemini-cli).
-   The Gemini agent should work non-interactively like the OpenAI Codex agent and directly modify the files in the repository.
-   Add a flag `--agent gemini` to choose which agent to use.
-   The Gemini agent should behave the same way as other agents, it should process the prompts in the same way, commit the changes to git, etc.
-   The reporting of the price spent on Gemini calls should work in a same way as for other runners.
-   Gemini is already installed in the development environment, you can run it from the command line with `gemini`.
-   The coding agent is just a module to be able to extend it with more agents in the future.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🦅] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨🦅] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨🦅] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)
