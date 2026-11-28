[x] ~$0.43 18 minutes by OpenAI Codex `gpt-5.3-codex`

[✨💌] Add `--priority` flag to the coding agent script

-   Purpose of this flag is to allow filter the AI coding tasks by their priority. For example, if you set `--priority 3`, the coding agent script will only implement the tasks that have priority 3 or higher. This is useful when you have a lot of tasks and you want to focus on the most important ones first.
-   The usage is `--priority 1` where the priority is a number of minimal priority, the prompt has to have to be implemented by the Coding Agent script.
-   By default, it is zero - All tasks are implemented - The current behavior.
-   Do not interfere with other flags like `--agent` or `--model`.
-   When priority flag is set, change the message from `Done: 85 | For agent: 5 | To be written: 16` -> `Done: 85 | For agent: 3 | Priority <4: 2 | To be written: 10`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the coding agent script before you start implementing.
-   You are working with the [coding agent script](./scripts/run-codex-prompts/run-codex-prompts.ts)

---

[-]

[✨💌] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨💌] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨💌] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](changelog/_current-preversion.md)

