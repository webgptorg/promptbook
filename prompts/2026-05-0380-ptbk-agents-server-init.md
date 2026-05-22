[ ] !!!

[✨✋] Create `ptbk agents-server init` command to initialize the Agents Server configuration

```bash
npm install ptbk
ptbk agents-server init
ptbk agents-server start --agent github-copilot --model gpt-5.4 --thinking-level xhigh
```

-   The `ptbk agents-server init` should initialize the `.env` file and add necessary configuration for the Agents Server to run properly.
-   It should also initialize `.gitignore` to exclude `node_modules`, `.promptbook`, `.logs`
-   Be aware of destructive changes in `.env` and `.gitignore`, if the file already exists, it should NOT overwrite existing values but rather add missing ones or update existing ones without removing any existing configuration that might be important for the user.
-   This safety mechanism is important to prevent loss of user configuration and to ensure that the initialization process is smooth and doesn't cause issues for users who already have some configuration in place. Both for `ptbk agents-server init` and `ptbk coder init` since they both use `.env` for configuration.
-   The created environment variables have comment above "# Created by `ptbk agents-server init` command" to make it clear which variables were created by the command and to help with maintenance and debugging in the future.
-   For each environment variable created by the `ptbk agents-server init` command, add a comment with a link to the documentation that explains what the variable is for and how to get the value for it. This will help users understand the purpose of each variable and how to properly configure them.
-   Look how `ptbk coder init` works
-   Keep in mind the DRY _(don't repeat yourself)_ principle, especially if there is any shared logic between `ptbk coder init` and the new `ptbk agents-server init` that can be abstracted and reused.
-   Do a proper analysis of the current functionality of `ptbk agents-server` and related functionality before you start implementing.
-   You are working with [`ptbk agents-server`](src/cli/cli-commands/agents-server/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
