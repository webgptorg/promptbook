[x]

[✨🏔] Create a script that will automatically feed OpenAI Codex with prompts.

It works as follows:

1. It will look at the folder ./prompts and list markdown files _(Do not list recursively, List only the shallow files in the folder `./prompts/_.md` , not in the subfolders)\*
2. Each file there can be N prompts. Prompts are separated by Markdown horizontal lines `---`.
3. Filter thoose which are not done yet. A prompt is considered done when there is a line with `[x]` at the top of the prompt and not done `[ ]`.
4. Take each not done prompt and run OpenAI Codex with it.
   4.B. Check that git workspace is clean, if not, abort the process.
   4.A. Change the `[ ]` -> `[x]` in the prompt before running the Codex, so if the process is interrupted, it will not repeat the same prompt again.
   4.C. Run OpenAI Codex with the prompt, and wait for the result.
   4.D. Commit the changes to git
5. Loop until all prompts are done.

-   Look at how running codex via CLI works.
    -   From the [prompt](./prompts/2026-01-0200-agent-use-scrapers-not-raw-files.md) it is created a [temporary file](./prompts/2026-01-0200-agent-use-scrapers-not-raw-files.sh) with the script to be run.
-   Create a temporary file for each prompt and do the cleanup after the prompt is done.
-   Look at [`$execCommand` utility](./src/utils/execCommand/$execCommand.ts), use this utility to run the CLI commands.
-   During the process _(which can take multiple hours)_, show some statistics like how many prompts are in total and how many are done.
    -   There can be also prompts without the `[ ]` or `[x]` status, those should be in category "not ready".
-   Do it modularly, to be able to extend it later via other LLM agents, not just OpenAI Codex.
-   Scripts are at ./scripts _(Look how other scripts are done for the inspiration)_
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

**This is how markdown file looks like:**

```markdown
[x]

[✨🏔] Do foo

Some additional description of the foo task.

---

[ <!-- IGNORE --> ]

[✨🏔] Do bar

Some additional description of the bar task.

---

[-]

[✨🏔] Do baz

Some additional description of the baz task which is not described yet.
```

<- In this example, there are 3 prompts, the first one is done, the second one should be processed by the script and the third one is not ready yet.

**This is the prompt which should be sent to OpenAI Codex:**

```
Do bar

Some additional description of the bar task.
```

**And this is the commit message:**

```
[✨🏔] Do bar

Some additional description of the bar task.
```

---

[x]

[✨🏔] Pause after each task in coding agent script

-   Now all tasks are processed one after another without any pause.
-   Add CLI interactivity to wait after each task is done.
-   Wait for user press [Enter] before commiting the current task changes and moving to the next task.
-   In this waiting step, show the user the commmit message to be used, use colors library to highlight it nicely in the terminal.
-   Before the first task show all upcoming tasks
-   You are waiting at the begining before exeting the first task and them after the coding is finished BUT before commiting the changes, then continue to the next task and wait again after the coding is finished before commiting.
-   Add flag `--no-wait` to skip this waiting and do the process automatically.
-   You are working with the [coding agent script](./scripts/run-codex-prompts/run-codex-prompts.ts)
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[x]

[✨🏔] Allow to prioritize prompts in coding agent script

-   Now the prompts are processed in the order of the files in the folder and their order in the file.
-   Add a way to prioritize some prompts to be done first.
-   The priority is done by adding exclamation marks to the `[ ]` status, like this:
    -   `[ ]` - no priority
    -   `[ ] ! ` - priority 1
    -   `[ ] !! ` - priority 2
    -   `[ ] !!! ` - priority 3
-   The more exclamation marks, the higher the priority.
-   Before the first task show all upcoming tasks to be done grouped by priority, translate number of exclamation marks to number.
-   You are working with the [coding agent script](./scripts/run-codex-prompts/run-codex-prompts.ts)
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🏔]


