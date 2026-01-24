codex \
  --ask-for-approval never \
  exec --model gpt-5.2-codex \
  --sandbox danger-full-access \
  -C /c/Users/me/work/ai/promptbook \
  <<'CODEX_PROMPT'

Fix OpenAI Codex coding agent

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

**Common rules**

- Always analyze the context and requirements before generating any code.
- Keep in mind the DRY _(don't repeat yourself)_ principle.
- Write clear, maintainable, and well-documented code.
- Write JSDoc comments for all functions, classes, types,...
- After code change, always run theese tests to verify the correctness:
    1) npm run test-name-discrepancies
    2) npm run test-spellcheck
    3) npm run test-lint
    4) npm run test-types
    5) npm run test-books
    6) npm run test-package-generation
    7) npm run test-unit
    8) npm run test-app-agents-server

**Additional context:**

- Attached images (if any) are relative to the root of the project.
-   **Promptbook Engine vs. Agent Server** sre two distinct parts you should know the difference:
    -   **Promptbook Engine** is the core engine that powers AI agents, it is located in `./src` folder. It is framework-agnostic and can be used in different applications. It can run as standalone javascript/typescript library, CLI environment, or be integrated into different applications. It can be also runned in Agent Server:
    -   **Agent Server** is a specific application that uses the Promptbook Engine to provide a web and API interface for creating and interacting with AI agents. It is located in `./apps/agents-server` folder.
-   **Commitments** are basic syntax elements that add specific functionalities to AI agents
    -   They are used in `agentSource`, there are commitments like `PERSONA`, `RULE`, `KNOWLEDGE`, `USE BROWSER`, `USE SEARCH ENGINE`, `META IMAGE`, etc.
    -   Commitments are in the folder `./src/commitments`
    -   Each commitment starts with a keyword, e.g., `KNOWLEDGE`, `USE BROWSER`, etc. on a begining of the line and end by new co
    -   Agent source with commitments is parsed by two functions:
        -   `parseAgentSource` which is a lightweight parser for agent source, it parses basic information and its purpose is to be quick and synchronous. The commitments there are hardcoded.
        -   `createAgentModelRequirements` which is an asynchronous function that creates model requirements it applies each commitment one by one and works asynchronously.

CODEX_PROMPT