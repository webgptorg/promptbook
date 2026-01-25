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

[x]

[✨🏔] Add Cline CLI to the [coding agent script](./scripts/run-codex-prompts/run-codex-prompts.ts)

-   There is a coding agent script at `./scripts/run-codex-prompts/run-codex-prompts.ts` which runs OpenAI Codex with prompts from the `./prompts` folder.
-   Add support to run prompts in [Cline CLI](https://docs.cline.bot/cline-cli/overview).
-   For the Cline agent, create a configuration file and into the configuration hardcode the model to be `gemini:gemini-3-flash-preview`.
-   The cline agent should work non-interactively like the OpenAI Codex agent and directly modify the files in the repository.
-   Add a flag `--agent openai-codex` or `--agent cline` to choose which agent to use.
-   You must choose an agent, if no agent is specified, show an error with help message and exit.
-   The Cline agent should behave the same way as the OpenAI Codex agent, it should process the prompts in the same way, commit the changes to git, etc.
-   The coding agent is just a module to be able to extend it with more agents in the future.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[x]

[✨🏔] Add Cline CLI to the [coding agent script](./scripts/run-codex-prompts/run-codex-prompts.ts)

-   There is a coding agent script at `./scripts/run-codex-prompts/run-codex-prompts.ts` which runs OpenAI Codex or Cline CLI with prompts from the `./prompts` folder.
-   Add support to run prompts in [Claude code](https://code.claude.com/).
-   The Claude code agent should work non-interactively like the OpenAI Codex agent and directly modify the files in the repository.
-   Add a flag `--agent claude-code` to choose which agent to use.
-   The Claude code agent should behave the same way as other agents, it should process the prompts in the same way, commit the changes to git, etc.
-   The coding agent is just a module to be able to extend it with more agents in the future.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[x]

[✨🏔] Standartize runners of [coding agent script](./scripts/run-codex-prompts/run-codex-prompts.ts)

-   All runners should create a temporary script file to run the agent with the prompt, look how it is done in OpenAI Codex runner.
-   Keep in mind the DRY _(don't repeat yourself)_ principle, make sure there is no duplicate code between the runners, if there is, refactor it and make common utilities.

---

[x]

[✨🏔] Leverage JSON information in Claude code in [coding agent script](./scripts/run-codex-prompts/run-codex-prompts.ts)

```bash
$ claude "Create file named nonce-foo-2.txt with content foo" --output-format json --print --allowedTools "Bash,Read,Edit,Write"
{"type":"result","subtype":"success","is_error":false,"duration_ms":10411,"duration_api_ms":8469,"num_turns":3,"result":"The file `nonce-foo-2.txt` already exists with the content \"foo\", which is exactly what you requested. No changes are needed.","session_id":"93a28b81-cc27-4cf6-bd85-55d264770c88","total_cost_usd":0.03936915,"usage":{"input_tokens":16,"cache_creation_input_tokens":5405,"cache_read_input_tokens":51858,"output_tokens":233,"server_tool_use":{"web_search_requests":0,"web_fetch_requests":0},"service_tier":"standard","cache_creation":{"ephemeral_1h_input_tokens":0,"ephemeral_5m_input_tokens":5405}},"modelUsage":{"claude-sonnet-4-5-20250929":{"inputTokens":16,"outputTokens":233,"cacheReadInputTokens":51858,"cacheCreationInputTokens":5405,"webSearchRequests":0,"costUSD":0.03936915,"contextWindow":200000,"maxOutputTokens":64000}},"permission_denials":[],"uuid":"2027b8df-69fc-4914-bd83-7a1052a5a377"}
```

-   Create system to report the usage statistics of Coding agent after the prompt is done and into the markdown file with the prompt.
-   Leverage the [usage object of Promptbook](/src/execution/Usage.ts) and the functions there are to manipulate with the usage.
-   For the runners we dont know, use [`UNCERTAIN_USAGE` constant](/src/execution/utils/usage-constants.ts)
-   When the runner does its work, add the usage information to the checkbox and also remove the exclamation marks for priority.
    -   For example: "[ ]" -> "[x] $0.12"
    -   For example: "[ ] !!" -> "[x] $3.05"
    -   For example: "[ ] !!!!!" -> "[x] ~$1.12" (when the usage is uncertain)
-   Keep in mind the DRY _(don't repeat yourself)_ principle, make sure there is no duplicate code between the runners, if there is, refactor it and make common utilities.

---

[x]

[✨🏔] Fix OpenAI Codex coding agent

-   OpenAI Codex runner in [coding agent script](./scripts/run-codex-prompts/run-codex-prompts.ts) runs successfully but it ends with message "tokens used ..."
-   In this state it is locked forever and never ends.
-   Fix it so when the Codex spits out the "tokens used ..." message, the runner understands the process is done and exits successfully.
-   Put there a wait time of 1 minute to wait for any additional output from Codex after the "tokens used ..." message.
-   If there is no additional output after 1 minute, consider the process finished successfully and exit.
-   Then continue same as if the process ended successfully.

**This is how the output looks like:**

```bash
...

+        const parameterMarker = `${REPLACING_NONCE}parameter-${index}`;
+        const templateValue = isPrompt
+            ? promptMarker
+            : isInline
+              ? escapePromptParameterValue(stringValue, { includeBraces: false })
+              : parameterMarker;
+
+        return { name, stringValue, isPrompt, isInline, promptMarker, parameterMarker, templateValue };
+    });
+    const parameters = Object.fromEntries(parameterEntries.map((entry) => [entry.name, entry.templateValue]));
+    const parameterNames = parameterEntries.map((entry) => entry.name);

     // Combine strings and values
     let pipelineString = stringsWithHiddenParameters.reduce(
         (result, stringsItem, i) =>
-            placeholderParameterNames[i] === undefined
-                ? `${result}${stringsItem}`
-                : `${result}${stringsItem}{${placeholderParameterNames[i]}}`,
+            parameterNames[i] === undefined ? `${result}${stringsItem}` : `${result}${stringsItem}{${parameterNames[i]}}`,
         '',
     );

@@ -49,7 +172,7 @@
             throw error;
         }

-        console.error({ pipelineString, parameters, placeholderParameterNames, error });
+        console.error({ pipelineString, parameters, parameterNames, error });
         throw new UnexpectedError(
             spaceTrim(
                 (block) => `
@@ -69,7 +192,29 @@
         .split(`${REPLACING_NONCE}endbracket`)
         .join('}');

-    return pipelineString;
+    for (const entry of parameterEntries) {
+        if (entry.isPrompt) {
+            pipelineString = pipelineString.split(entry.promptMarker).join(entry.stringValue);
+            continue;
+        }
+
+        if (!entry.isInline) {
+            pipelineString = pipelineString.split(entry.parameterMarker).join(`{${entry.name}}`);
+        }
+    }
+
+    const structuredParameters = parameterEntries.filter((entry) => !entry.isPrompt && !entry.isInline);
+
+    if (structuredParameters.length > 0) {
+        const parameterItems = structuredParameters.map((entry) => ({
+            name: entry.name,
+            value: escapePromptParameterValue(entry.stringValue, { includeBraces: true }),
+        }));
+
+        pipelineString = `${pipelineString}\n\n${buildParametersSection(parameterItems)}`;
+    }
+
+    return new PromptString(pipelineString);
 }

 /**


Enhanced prompt template interpolation to return `PromptString`, inline safe data, move unsafe/multiline values into a structured
parameters section with escaping, and preserve nested prompt inserts in `src/pipeline/prompt-notation.ts`. Updated prompt notation coverage for the three examples plus multiline/special-char/non-string cases in `src/pipeline/prompt-notation.test.ts`, adjusted
`src/pipeline/book-notation.ts` to consume PromptString via `.toString()`, regenerated exports in `src/_packages/utils.index.ts`,
and added a changelog entry in `changelog/_current-preversion.md`.

**Tests**
- `npm run test-name-discrepancies`
- `npm run test-spellcheck`
- `npm run test-lint`
- `npm run test-types`
- `npm run test-books`
- `npm run test-package-generation`
- `npm run test-unit`
- `npm run test-app-agents-server` (timed out during `next build` after ~240s; lint step passed)

**Notes**
- Untracked file `prompts/2026-01-0250-client-baraja-1.sh` appeared in `git status` and I didn’t create it. How would you like to
proceed with it?

**Next Steps**
1) Rerun `npm run test-app-agents-server` with a longer timeout to see if `next build` completes.
2) If it still hangs, consider clearing `apps/agents-server/.next` and retrying the build.

tokens used
245,879
```

---

[x]

[✨🏔] Add [Opencode](https://opencode.ai/) to the [coding agent script](scripts/run-codex-prompts/run-codex-prompts.ts)

-   There is a coding agent script at `scripts/run-codex-prompts/run-codex-prompts.ts` which runs OpenAI Codex and other runners with prompts from the `./prompts` folder.
-   Add support to run prompts in [Opencode](https://opencode.ai/) in non-interactive mode.
-   The Opencode runner should work non-interactively like the OpenAI Codex agent and directly modify the files in the repository.
-   Add a flag `--agent opencode` to choose the runner.
-   Also add (and require) an additional flag `--model` to specify the model to use with the Opencode runner.
-   The Opencode runner should behave the same way as other runners, it should process the prompts in the same way, commit the changes to git, etc.
-   Report the usage statistics of the Opencode runner in a same way as other runners, for example the Claude code runner.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨🏔] Allow Opencode in [coding agent script](scripts/run-codex-prompts/run-codex-prompts.ts) to use OpenAI and Google models

-   There is a coding agent script at `scripts/run-codex-prompts/run-codex-prompts.ts` which runs Opencode and other runners with prompts from the `./prompts` folder.
-   It supports Opencode runner.
-   Add an additional and optional flags to specify that we dont want to use Opencode default models, but we want to use OpenAI or Google models via Opencode.
-   The API keys for OpenAI and Google models should be taken from the environment variables in `.env` like `OPENAI_API_KEY` and `GOOGLE_GENERATIVE_AI_API_KEY`.
-   The Opencode runner should behave the same way, it should process the prompts in the same way, commit the changes to git, etc.
-   Report the usage statistics of the Opencode runner in a same way as other runners, for example the Claude code runner.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🏔]
