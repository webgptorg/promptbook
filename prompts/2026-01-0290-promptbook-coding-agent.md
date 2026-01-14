[ ]

[✨🏔] Create a script that will automatically feed OpenAI Codex with prompts.

It works as follows:

1. It will look at the folder /prompts and list markdown files _(Do not list recursively, List only the shallow files in the folder `/prompts/_.md` , not in the subfolders)\*
2. Each file there can be N prompts. Prompts are separated by Markdown horizontal lines `---`.
3. Filter thoose which are not done yet. A prompt is considered done when there is a line with `[x]` at the top of the prompt and not done `[ ]`.
4. Take each not done prompt and run OpenAI Codex with it.
   4.B. Check that git workspace is clean, if not, abort the process.
   4.A. Change the `[ ]` -> `[x]` in the prompt before running the Codex, so if the process is interrupted, it will not repeat the same prompt again.
   4.C. Run OpenAI Codex with the prompt, and wait for the result.
   4.D. Commit the changes to git
5. Loop until all prompts are done.

-   Look at [the sample](/prompts/2026-01-0200-agent-use-scrapers-not-raw-files.sh) how running codex via CLI works.
-   Create a temporary file for each prompt and do the cleanup after the prompt is done.
-   Look at [`$execCommand` utility](/src/utils/execCommand/$execCommand.ts), use this utility to run the CLI commands.
-   During the process _(which can take multiple hours)_, show some statistics like how many prompts are in total and how many are done.
    -   There can be also prompts without the `[ ]` or `[x]` status, those should be in category "not ready".
-   Do it modularly, to be able to extend it later via other LLM agents, not just OpenAI Codex.
-   Scripts should be at /scripts, Look how other scripts are done.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

**This is how markdown file looks like:**

```markdown
[x]

[✨🏔] Do foo

Some additional description of the foo task.

---

[ ]

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
