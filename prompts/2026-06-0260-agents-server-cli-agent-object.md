[x] $3.86 2 hours by OpenAI Codex `gpt-5.4`

[✨🪤] Create a `CliAgent` and `LiteAgent` objects in `src/book-3.0`

-   Both will allow user to run agents directly from the javascript in node
-   The `CliAgent` will be using exec (which exists here in utils) and run `ptbk agent exec` command, while the `LiteAgent` will be using OpenAI Agents SDK
-   The `CliAgent` is wrapper around the `ptbk agent` commands
-   The `LiteAgent` is wrapper around the OpenAI Agents SDK, which does same thing but not using as powerful harnesses as `ptbk agent` commands
-   Both of them should be published via `@promptbook/node` package
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[x] $1.41 34 minutes by Claude Code

[✨🪤] `CliAgent` and `LiteAgent` should should not rely on calling CLI but directly use what the cli commands does

-   Now it executes the CLI command `ptbk`
-   This adds unnecessary overhead
-   Look at `DEFAULT_CLI_AGENT_COMMAND` - this shouldnt be there
-   The `ptbk` command should not be used, instead use the same code that is used in the CLI command, but directly in the code, without calling the CLI command, this will make it more efficient and faster
-   Keep in mind the DRY _(don't repeat yourself)_ principle, share the code between the CLI command and the `CliAgent` as much as possible, but without calling the CLI command
-   Do a proper analysis of the current functionality before you start implementing.

---

[x] $4.48 2 hours by Claude Code

[✨🪤] `CliAgent` must just work

```typescript
// const { LiteAgent: Agent } = await import('@/promptbook/src/book-3.0/LiteAgent');
const { CliAgent: Agent } = await import('@/promptbook/src/book-3.0/CliAgent');

const agent = new Agent({
    agentPath: 'agents/draft-expert.book',
});

const response = await agent.run(
    prompt`
        Write a markdown draft for a agent definition with the following name and description.

        Wrap the output in a single markdown code block

        Name: ${agentName}
        Description: ${agentDescription}
    `.toString(),
);
```

-   `CliAgent` and `LiteAgent` should work the same, but `CliAgent` should be more powerful
-   Now it fails on `Missing --harness in non-dry run mode`
-   Keep in mind the DRY _(don't repeat yourself)_ principle, share the code between the CLI command and the `CliAgent` and `LiteAgent` as much as possible, but without calling the CLI command
-   Do a proper analysis of the current functionality before you start implementing.

---

[x] $0.5477 an hour by Claude Code

[✨🪤] Both `CliAgent` and `LiteAgent` should have `isVerbose` option

```typescript
const agent = new CliAgent({
    agentPath: 'agents/draft-expert.book',
    harness: 'openai-codex',
    model: 'gpt-5.4',
    thinkingLevel: 'high',
    isVerbose: true,
});
```

-   The return should be the same, just print the logs to the console, but still return the same response
-   Keep in mind the DRY _(don't repeat yourself)_ principle, share the code between the CLI command and the `CliAgent` and `--verbose` option as much as possible, but without calling the CLI command
-   Do a proper analysis of the current functionality before you start implementing.

