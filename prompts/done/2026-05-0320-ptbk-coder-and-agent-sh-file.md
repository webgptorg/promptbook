[x] ~$0.4191 an hour by OpenAI Codex `gpt-5.5`

[✨👖] Commands `ptbk coder` and `ptbk agent-folder` should show path to temporary `sh` file of ongoing prompt

-   `ptbk coder` and `ptbk agent-folder` are creating temporary `sh` file for each prompt that is being executed, show the path to that file in the terminal UI, so that users can easily access it if they want to see the details of the prompt execution, debug it, etc.
-   It should be shown in the "Session" box, and it should be clickable to open the file in the default code editor of the user
-   Also the `ptbk coder` creates theese files alongside the `.md` prompt file, the `ptbk agent-folder` creates theese files in the temporary directory, but both of them should create theese files in the same way in temporary directory
-   Keep in mind the DRY _(don't repeat yourself)_ principle, especially when it comes to sharing code between `ptbk coder` and `ptbk agent-folder`, share as much code as possible between them for this functionality
-   Do a proper analysis of the current functionality of `ptbk agent-folder` and `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk agent-folder`](src/cli/cli-commands/agent-folder/run.ts)
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨👖] baz

```bash
@@@

npm install ptbk

ptbk agent-folder init

ptbk agent-folder run --agent github-copilot --model gpt-5.4 --thinking-level xhigh
```

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk agent-folder` and related functionality before you start implementing.
-   You are working with [`ptbk agent-folder`](src/cli/cli-commands/agent-folder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨👖] baz

```bash
@@@

npm install ptbk

ptbk agent-folder init

ptbk agent-folder run --agent github-copilot --model gpt-5.4 --thinking-level xhigh
```

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk agent-folder` and related functionality before you start implementing.
-   You are working with [`ptbk agent-folder`](src/cli/cli-commands/agent-folder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨👖] baz

```bash
@@@

npm install ptbk

ptbk agent-folder init

ptbk agent-folder run --agent github-copilot --model gpt-5.4 --thinking-level xhigh
```

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk agent-folder` and related functionality before you start implementing.
-   You are working with [`ptbk agent-folder`](src/cli/cli-commands/agent-folder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

