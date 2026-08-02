[ ]

[✨🙁] Add in progress signal to the `ptbk coder`

**Initial state:**

```bash
[ ]
```


**And then:**

```bash
[^] by OpenAI Codex `gpt-5.6-luna` thinking `max` (ChatGPT account) - Implementation in progress
```

**And then:**

```bash
[^] by OpenAI Codex `gpt-5.6-luna` thinking `max` (ChatGPT account) - Implementation ~$0.2036 10 minutes; Testing in progress
```


**And then finishes:**

```bash
[x] by OpenAI Codex `gpt-5.6-luna` thinking `max` (ChatGPT account) - Implementation ~$0.2036 10 minutes; Testing 35 minutes
```

- Now the start and result are exactly the same, but the difference is that there are no middle in progress states, and Promptbook coder goes directly from not started `[ ]` to fully implemented `[x]`, now it will go throuh in progress stage `[^]`
- Change `[x]` to `[^]` when the task starts and change `[^]` to `[x]` when the task finishes and its verified, commited should be the `[x]` state
-  If something fails (for example, the process is killed or there is some internal error or whatever), do not revert this in-progress state. Keep it there as some signal that the task was left in the middle of the implementation. 
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing) if its relevant
-   Add the changes into the [changelog](changelog/_current-preversion.md)
