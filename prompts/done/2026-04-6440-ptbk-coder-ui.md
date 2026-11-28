[x] Manually

[✨🌉] `ptbk coder run` should have terminal UI

```bash
ptbk coder run --agent github-copilot --model gpt-5.4 --thinking-level xhigh --context AGENTS.md
```

-   Now it just prints the output of the agent, but it should have a terminal UI using Ink and React
-   It sould work universally for all runners
-   There should be:
    -   Promptbook coder branding in the UI
    -   Which agent is currently running, which model, thinking level, context, priority, etc.
    -   The status (which is already printed) like `1/1 Prompts (475 total) | 100% | 45m/45m | Estimated done Today 10:46`
    -   The loadingbar
    -   The current thinking message of the agent, which is printed in real time as the agent thinks, and it should be updated in real time in the UI
    -   Pause feature
    -   Retryies and errors should be also printed in real time in the UI
-   Do not change behaviour of other commands of `ptbk coder` or `ptbk` in general, just add the terminal UI for `ptbk coder run`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

![alt text](prompts/screenshots/2026-04-6440-ptbk-coder-ui.png)

---

[x] ~$0.00 17 minutes by GitHub Copilot `gpt-5.4`

[✨🌉] Add flag `--no-ui` to `ptbk coder run`

```bash
ptbk coder run --agent github-copilot --model gpt-5.4 --thinking-level xhigh --context AGENTS.md --no-ui
```

-   When present, the `--no-ui` flag should disable the terminal UI and just print the output of the agent as it is currently done, without any UI, which is useful for logging and debugging purposes
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[x] ~$0.00 an hour by GitHub Copilot `gpt-5.4`

[✨🌉] Enhance the UI of `ptbk coder run`

```bash
ptbk coder run --agent github-copilot --model gpt-5.4 --thinking-level xhigh --context AGENTS.md
```

-   The Promptbook coder should be in some box in the UI, and there should be some nice branding and design to make it look good, maybe some colors, borders, etc.
-   The "Pause ..." is multiplicated at the end
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

![alt text](prompts/screenshots/2026-04-6440-ptbk-coder-ui-1.png)
![alt text](prompts/screenshots/2026-04-6440-ptbk-coder-ui-2.png)

---

[x] ~$0.00 an hour by GitHub Copilot `gpt-5.4`

[✨🌉] Enhance `ptbk coder run` statusbar

```bash
ptbk coder run --agent github-copilot --model gpt-5.4 --thinking-level xhigh --context AGENTS.md
```

**The status look like:**

```
1/8 Prompts (500 total) │ 0s/0s │ Est. done Today 12:46
███████████████████████████████████████░ 97%
```

**But should look more like:**
_(but maybe better put into the layout of the terminal UI)_

```
Working on 1/8 PRDs with Priority: ≥ 1 | Not working on 100 PRDs with Priority: ≥ 0 │ 10s / 1h 33m │ Est. done Today 12:46
███░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 20%
```

-   "0s/0s" is not very informative, it should show the elapsed time and the estimated total time, so it should look like "45m/1h30m" for example, and it should be updated in real time as the agent is running
-   "97%" is also not very informative, it should show the percentage of completion based on the number of prompts completed out of the total number of prompts, so it should be "60%" for example, and it should be updated in real time as the agent is running
-   Try to think of a way to report the status in a better way, maybe with some colors, or some other visual elements to make it more clear and informative
-   The information there should not be ambiguous
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
