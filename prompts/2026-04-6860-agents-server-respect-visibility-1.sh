if [ -f .env ]; then
set -a
source .env
set +a
fi

unset OPENAI_API_KEY
unset OPENAI_BASE_URL

codex \
      -c forced_login_method=chatgpt \
      -c model_reasoning_effort="xhigh" \
    --ask-for-approval never \
    exec --model gpt-5.5 \
    --local-provider none \
    --sandbox danger-full-access \
    -C /c/Users/me/work/ai/promptbook \
    <<'CODEX_PROMPT'

Respect visibility of the agents and do security checkup that it works as supposed

-   There are 3 visibility levels for the agents:
    1. Private - only visible to the logged in users and other agents via `TEAM` commitment
       When non-logged in user tries to access the private agent, they should get 403 Forbidden error
       For now there are no access levels for the agents, so all logged in users can see all private agents
    2. Unlisted - visible to everyone who has the link to the agent and also to other agents via `TEAM` commitment
    3. Public - visible to everyone
-   When the agent is public or unlisted and its `TEAM` teammates are private or unlisted, the agent should be visible and usable to the teammates even for non-logged in users
    -   Anonymous user: [Public agent] --talking internally with--> [Private agent] - _working_
    -   Anonymous user: [Unlisted agent] --talking internally with--> [Private agent] - _working_
    -   Any user: [Any agent] --talking with federated server--> [Private agent] - _403 Forbidden error_
    -   Any user: [Any agent] --talking with federated server--> [Unlisted agent] - _working_
    -   Any user: [Any agent] --talking with federated server--> [Public agent] - _working_
    -   Anonymous user: [Private agent] - _403 Forbidden error_
-   When the agent is visible, you can see its profile and chat with it.
-   But there are also pages of the agent that should be protected for only logged in users regardless of the visibility of the agent, these are:
    -   Profile - Accessible according to the visibility of the agent
    -   Chat - Accessible according to the visibility of the agent
    -   Timeouts - Accessible according to the visibility of the agent
    -   Copy Agent URL - Accessible according to the visibility of the agent
    -   Copy Agent Email - Accessible according to the visibility of the agent
    -   Show QR Code - Accessible according to the visibility of the agent
    -   Open Folder: testing teams - Accessible only for public agents, for private and unlisted agents it should be hidden
    -   Standalone Chat - Accessible according to the visibility of the agent
    -   Edit Book & Chat - Accessible only for logged in users
    -   Textarea Entry - Accessible according to the visibility of the agent
    -   Edit Book - Accessible only for logged in users
    -   Rename Agent - Accessible only for logged in users
    -   Clone agent - Accessible only for logged in users
    -   Delete Agent - Accessible only for logged in users
    -   Update visibility - Accessible only for logged in users
    -   Chat History - Accessible only for logged in users
    -   Usage Analytics - Accessible only for logged in users
    -   Chat Feedback - Accessible only for logged in users
    -   Integration - Accessible only for logged in users
    -   Show System Message - Accessible only for logged in users
    -   Export Agent - Accessible only for logged in users
-   The agent source (the agent book) should be accessible only for logged in users, regardless of the visibility of the agent
-   Exporting or editing the agent should be accessible only for logged in users, regardless of the visibility of the agent
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

## How to Contribute

-   **Add changes in [Changelog](/changelog/_current-preversion.md)**
-   **Test your changes** to ensure they work as expected, use `npm test`

## Code Style

-   Follow the existing code style and structure.
-   Use comments to explain complex logic.

## Emoji in `[brackets]`

-   `[any emoji]` Connects multiple places that are related to each other across the repository
-   `[number]` Connects multiple places that are related to each other across the file
-   `[🧠]` Marks a place where there is something to decide and think about.
-   `[🕕]` List of models _(that should be progresively updated)_
    -   Prompt: Update available models and their prices, search online
-   `[🔼]` Marks an entity (function, class, type,...) in other project (like Promptbook.studio) which should be moved to this repository
-   `[🚉]` Marks an types / interfaces / structures fully serializable as JSON, not marking `string_` and `number_` prefixed aliases
-   `[🧹]` Need to implement garbage collection
-   `[🐣]` Easter eggs
-   `[💩]` Shitty code that needs refactoring
-   `$` When entity (function, class) starts by `$`, it means it is not pure and can have side effects.
-   3x `!` Marks a place that needs to be fixed before releasing a pre-release version.
-   4x (and more) `!` Marks a place that needs to be fixed as soon as possible.
-   `@@@` Marks a place where text / documentation / ... must be written.
-   [⚫] Code in this file should never be published in any package
-   [🟢] Code in this file should never be published into packages that could be imported into browser environment
-   [🔵] Code in this file should never be published outside of `@promptbook/browser`
-   [🟡] Code in this file should never be published outside of `@promptbook/cli`
-   [💞] Ignore a discrepancy between file name and entity name

## Generated code

Across the repository, there are several places where code has been generated automatically.
Do not edit these places manually, as they will be overwritten by the code generation process. Edit the source files instead.

> ⚠️ WARNING: This code has been generated so that any manual changes will be overwritten

## Dictionary

-   **Promptbook Engine vs. Agent Server** sre two distinct parts you should know the difference:
    -   **Promptbook Engine** is the core engine that powers AI agents, it is located in `/src` folder. It is framework-agnostic and can be used in different applications. It can run as standalone javascript/typescript library, CLI environment, or be integrated into different applications. It can be also runned in Agent Server:
    -   **Agent Server** is a specific application that uses the Promptbook Engine to provide a web and API interface for creating and interacting with AI agents. It is located in `/apps/agents-server` folder.
-   **Commitments** are basic syntax elements that add specific functionalities to AI agents
    -   They are used in `agentSource`, there are commitments like `PERSONA`, `RULE`, `KNOWLEDGE`, `USE BROWSER`, `USE SEARCH ENGINE`, `META IMAGE`, etc.
    -   Commitments are in the folder `/src/commitments`
    -   Each commitment starts with a keyword, e.g., `KNOWLEDGE`, `USE BROWSER`, etc. on a begining of the line and end by new co
    -   Agent source with commitments is parsed by two functions:
        -   `parseAgentSource` which is a lightweight parser for agent source, it parses basic information and its purpose is to be quick and synchronous. The commitments there are hardcoded.
        -   `createAgentModelRequirements` which is an asynchronous function that creates model requirements it applies each commitment one by one and works asynchronously.

## Common rules

-   Always analyze the context and requirements before generating any code.
-   Write clear, maintainable, and well-documented code.
-   Write JSDoc comments for all entities - functions, classes, types, top-level constants, etc.
    -   When this entity is exported from the file and it is under `src` folder _(not for example in the `apps` folder)_, it must be marked either as `@public` or `@private` at the end of the JSDoc comment.
    -   For example: "@private internal utility of <Chat/>" / "@public exported from `@promptbook/browser`"
    -   If you don't know, prefer to mark it as private, we can always change it to public later, but changing from public to private may cause breaking changes.
-   You (the AI coding agent) are running inside a Node process, so do not kill all Node processes such as `taskkill /F /IM node.exe`. If you need to stop something you spawned, kill only that specific process, for example by PID or by port.

## Additional context

-   Attached images (if any) are relative to the root of the project.

### The Agents Server menu _(as additional context)_

The menu of the agent server looks like this:

1. The navigation hierarchy
    - Icon and Server name _(for example Promptbook Agents Server)_
    - arrow ">" and Agents or picked agent name (organized in folders)
    - arrow ">" and the view Profile / Chat / Book of the agent or nothing if no agent is picked
2. The menu items
    - Documentation
    - System
3. Control panel and user menu
    - Control panel
    - User menu with the avatar and the name of the user

### Database migrations for Agents server _(as additional context)_

-   Migrations are located in `apps/agents-server/src/database/migrations`
-   Be aware that table names in migrations have prefix `prefix_` _(look at existing migrations for reference)_
-   Migrations should be backwards compatible:
    -   Meaning that earlier versions of the server should be able to run with the database after migration without any issues.
    -   This is important because we want to have the same database for production and preview environments.
    -   This database will be migrated to the latest version of the preview environment, but the production environment should be able to run with it without any issues.
    -   The only thing that can happen is that older versions of the server will not be able to use new features.
    -   Adding new columns, tables, etc. is fine, but do not remove or rename existing ones, and do not change the meaning of existing columns or tables.
    -   When in doubt, prefer to add new things instead of changing existing ones.

### Metadata of Agents server _(as additional context)_

-   There is a table called `Metadata`.
-   It has `key` and `value` fields.
-   It is a similar concept to configuration, but this configuration can be changed by administrators in the Agents Server website.

### Book Language blueprint _(as additional context)_

Book language is a domain-specific language used for defining AI agents in the Promptbook Engine and Agents server.
It has lightweight syntax and keywords (the commitments) that allow you to define the "soul" of the agent.
The book language is designed to be human-readable and easy to write, while also being powerful enough to express complex agent behaviors.

Every agent has its source defined in the book language, which is called "agent source". The agent source is parsed and processed by the Promptbook Engine to create the actual AI agent that can interact with users and perform tasks.
This agent source is internally converted to a structured format called "agent model requirements" which are the actual raw technical instructions for the AI model to run the agent.

There is a standalone book language documentation on each agent server on `/api/docs/book.md` route, for example `https://pavol-hejny.ptbk.io/api/docs/book.md`.
Use it as a reference for the syntax and semantics of the book language, and modify `apps/agents-server/src/utils/bookLanguageDocumentation/createStandaloneBookLanguageMarkdown.ts` if it is relevant to the change you are doing.

#### Commitments _(as additional context and part of Book Language)_

Commitments are basic syntax elements that add specific functionalities to AI agents written in `book` language.

-   They are used in `agentSource`, there are commitments like `PERSONA`, `RULE`, `KNOWLEDGE`, `USE BROWSER`, `USE SEARCH ENGINE`, `META IMAGE`, `CLOSED`, etc.
-   They are in the folder `src/commitments`.
-   Each commitment starts with a keyword, e.g. `PERSONA`, `KNOWLEDGE`, `USE SEARCH ENGINE`, etc. on a beginning of the line and ends by a new commitment or the end of the book.
-   There is a general pattern that the commitment keyword is followed by a space and then by the content of the commitment, for example:
    -   `PERSONA You are a helpful assistant that helps with cooking recipes.`
    -   `USE SEARCH ENGINE Search only in French.`
-   In the commitment context, you can reference external agents, for example:
    -   `TEAM You can talk to {Criminal lawyer} and {Financial advisor}`

## Coding rules

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Keep in mind the SOLID principles.
-   Do a proper analysis of the current functionality before you start implementing.
-   Keep small responsibilities of functions and classes, avoid creating big functions or classes that do many things.
-   When throwing errors, throw [branded errors](src/errors) and use `spaceTrim` utility to write clear and well-formatted multiline detailed error messages.
    -   Format errors as markdown, for example `variables` should be in backticks and important notes can be in bold.
-   Constants should always be `UPPER_SNAKE_CASE`.
-   Boolean variables should always be prefixed with `is`, for example `isUserChatJobLeaseExpired` or `IS_DEBUG_MODE`.
-   Do not use abbreviations, for example use `isExpired` instead of `isExp`, `translateMessage` instead of `t`, etc.
    -   It is fine to use well-known abbreviations, for example `id`, `url`, `html`, etc.
-   When writing multiline strings, use `spaceTrim` utility.
-   Do only the change described in the prompt. Do not add any additional features or make any additional changes that are not described there.
    -   If you find some critical issue that is not described in the prompt, report it to `./AGENT_REPORT.md` in the root of the project.

The previous implementation did not pass the required verification command.

## Automated verification feedback
- Retry attempt: 2 of 3
- Verification command: `npm run test-for-ptbk-coder`
- Update the current implementation so the verification command passes without breaking the original task requirements.

### Verification output
```
        [...verification output truncated to the last 12000 characters...]
        s
1663/1701 src/utils/validators/email/isValidEmail.test.ts 3.01ms
1664/1701 src/utils/validators/email/isValidEmail.ts 2.23ms
1665/1701 src/utils/validators/filePath/isRootPath.test.ts 2.30ms
1666/1701 src/utils/validators/filePath/isRootPath.ts 2.73ms
1667/1701 src/utils/validators/filePath/isValidFilePath.test.ts 8.28ms
1668/1701 src/utils/validators/filePath/isValidFilePath.ts 4.07ms
1669/1701 src/utils/validators/javascriptName/isValidJavascriptName.test.ts 2.58ms
1670/1701 src/utils/validators/javascriptName/isValidJavascriptName.ts 3.43ms
1671/1701 src/utils/validators/parameterName/validateParameterName.test.ts 4.01ms
1672/1701 src/utils/validators/parameterName/validateParameterName.ts 5.37ms
1673/1701 src/utils/validators/semanticVersion/isValidPromptbookVersion.test.ts 4.33ms
1674/1701 src/utils/validators/semanticVersion/isValidPromptbookVersion.ts 2.78ms
1675/1701 src/utils/validators/semanticVersion/isValidSemanticVersion.test.ts 4.67ms
1676/1701 src/utils/validators/semanticVersion/isValidSemanticVersion.ts 3.01ms
1677/1701 src/utils/validators/url/extractUrlsFromText.test.ts 31.80ms
1678/1701 src/utils/validators/url/extractUrlsFromText.ts 10.08ms
1679/1701 src/utils/validators/url/isHostnameOnPrivateNetwork.test.ts 5.06ms
1680/1701 src/utils/validators/url/isHostnameOnPrivateNetwork.ts 22.78ms
1681/1701 src/utils/validators/url/isUrlOnPrivateNetwork.test.ts 14.27ms
1682/1701 src/utils/validators/url/isUrlOnPrivateNetwork.ts 2.80ms
1683/1701 src/utils/validators/url/isValidAgentUrl.test.ts 6.81ms
1684/1701 src/utils/validators/url/isValidAgentUrl.ts 3.43ms
1685/1701 src/utils/validators/url/isValidPipelineUrl.test.ts 4.27ms
1686/1701 src/utils/validators/url/isValidPipelineUrl.ts 7.36ms
1687/1701 src/utils/validators/url/isValidUrl.test.ts 3.16ms
1688/1701 src/utils/validators/url/isValidUrl.ts 3.31ms
1689/1701 src/utils/validators/url/normalizeDomainForMatching.test.ts 4.05ms
1690/1701 src/utils/validators/url/normalizeDomainForMatching.ts 6.78ms
1691/1701 src/utils/validators/uuid/isValidUuid.test.ts 2.63ms
1692/1701 src/utils/validators/uuid/isValidUuid.ts 2.20ms
1693/1701 src/version.ts 2.79ms
1694/1701 src/wizard/$getCompiledBook.ts 13.69ms
1695/1701 src/wizard/test/books/test.book.md 9.28ms
1696/1701 src/wizard/test/README.md 1.93ms
1697/1701 src/wizard/test/sub/books/test.book.md 1.94ms
1698/1701 src/wizard/test/sub/subsub/books/test.book.md 2.22ms
1699/1701 src/wizard/test/sub/subsub/subsubsub/books/test.book.md 2.50ms
1700/1701 src/wizard/test/sub/subsub/subsubsub/README.md 1.88ms
1701/1701 src/wizard/wizard.ts 14.28ms
CSpell: Files checked: 1701, Issues found: 0 in 0 files.

> promptbook@0.112.0-55 test-lint
> eslint src


> promptbook@0.112.0-55 test-types
> tsc


> promptbook@0.112.0-55 test-books
> echo "Note: [⚡️] Skipping the book test because it tests just the old pipeline books which are deprecated"

"Note: [⚡️] Skipping the book test because it tests just the old pipeline books which are deprecated"

> promptbook@0.112.0-55 test-book-components-build
> echo "Note: Skipping book components build tests because of constants problems with this test"

"Note: Skipping book components build tests because of constants problems with this test"

> promptbook@0.112.0-55 test-package-generation
> ts-node ./scripts/generate-packages/generate-packages.ts --skip-bundler

📦  Generating packages
[36m0️⃣  Prepare the needed information about the packages[39m
Promptbook version 0.112.0-55
[36m1️⃣  Generate entry file for each package[39m
[32mGenerated index file ./src/_packages/anthropic-claude.index.ts[39m
[32mGenerated index file ./src/_packages/azure-openai.index.ts[39m
[32mGenerated index file ./src/_packages/browser.index.ts[39m
[32mGenerated index file ./src/_packages/cli.index.ts[39m
[32mGenerated index file ./src/_packages/color.index.ts[39m
[32mGenerated index file ./src/_packages/components.index.ts[39m
[32mGenerated index file ./src/_packages/core.index.ts[39m
[32mGenerated index file ./src/_packages/deepseek.index.ts[39m
[32mGenerated index file ./src/_packages/documents.index.ts[39m
[32mGenerated index file ./src/_packages/editable.index.ts[39m
[32mGenerated index file ./src/_packages/fake-llm.index.ts[39m
[32mGenerated index file ./src/_packages/google.index.ts[39m
[32mGenerated index file ./src/_packages/javascript.index.ts[39m
[32mGenerated index file ./src/_packages/legacy-documents.index.ts[39m
[32mGenerated index file ./src/_packages/markdown-utils.index.ts[39m
[32mGenerated index file ./src/_packages/markitdown.index.ts[39m
[32mGenerated index file ./src/_packages/node.index.ts[39m
[32mGenerated index file ./src/_packages/ollama.index.ts[39m
[32mGenerated index file ./src/_packages/openai.index.ts[39m
[32mGenerated index file ./src/_packages/pdf.index.ts[39m
[32mGenerated index file ./src/_packages/remote-client.index.ts[39m
[32mGenerated index file ./src/_packages/remote-server.index.ts[39m
[32mGenerated index file ./src/_packages/templates.index.ts[39m
[32mGenerated index file ./src/_packages/types.index.ts[39m
[32mGenerated index file ./src/_packages/utils.index.ts[39m
[32mGenerated index file ./src/_packages/vercel.index.ts[39m
[32mGenerated index file ./src/_packages/website-crawler.index.ts[39m
[32mGenerated index file ./src/_packages/wizard.index.ts[39m
[36m2️⃣  Generate package.json, README and other crucial files for each package[39m
[36m3️⃣  Cleanup build directories for each package[39m
[33mSkipping the cleanup for bundler[39m
[36m4️⃣  Generate bundle for each package[39m
[33mSkipping the bundler[39m
[36m5️⃣  Postprocess the generated bundle[39m
[33mSkipping postprocessing[39m
[36m6️⃣  Test that nothing what should not be published is published[39m
[33mSkipping the bundler, skipping the tests for bundle content[39m
[36m7️⃣  Add dependencies for each package[39m
[33mBundle file ./packages/components/esm/index.es.js does not exist[39m
[33mBundle file ./packages/core/esm/index.es.js does not exist[39m
[33mBundle file ./packages/deepseek/esm/index.es.js does not exist[39m
[33mBundle file ./packages/documents/esm/index.es.js does not exist[39m
[33mBundle file ./packages/editable/esm/index.es.js does not exist[39m
[33mBundle file ./packages/fake-llm/esm/index.es.js does not exist[39m
[33mBundle file ./packages/google/esm/index.es.js does not exist[39m
[33mBundle file ./packages/javascript/esm/index.es.js does not exist[39m
[33mBundle file ./packages/legacy-documents/esm/index.es.js does not exist[39m
[33mBundle file ./packages/markdown-utils/esm/index.es.js does not exist[39m
[33mBundle file ./packages/markitdown/esm/index.es.js does not exist[39m
[33mBundle file ./packages/node/esm/index.es.js does not exist[39m
[33mBundle file ./packages/ollama/esm/index.es.js does not exist[39m
[33mBundle file ./packages/openai/esm/index.es.js does not exist[39m
[33mBundle file ./packages/pdf/esm/index.es.js does not exist[39m
[33mBundle file ./packages/remote-client/esm/index.es.js does not exist[39m
[33mBundle file ./packages/remote-server/esm/index.es.js does not exist[39m
[33mBundle file ./packages/templates/esm/index.es.js does not exist[39m
[33mBundle file ./packages/types/esm/index.es.js does not exist[39m
[33mBundle file ./packages/utils/esm/index.es.js does not exist[39m
[33mBundle file ./packages/vercel/esm/index.es.js does not exist[39m
[33mBundle file ./packages/website-crawler/esm/index.es.js does not exist[39m
[33mBundle file ./packages/wizard/esm/index.es.js does not exist[39m
[36m9️⃣  Make publishing instructions for Github Actions[39m

> promptbook@0.112.0-55 test-unit
> jest --forceExit

(node:52156) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
PASS apps/agents-server/src/utils/userChat/heartbeatUserChatJob.test.ts (13.642 s)
PASS apps/agents-server/src/components/AgentAvatar/AgentAvatar.test.tsx (10.441 s)
PASS apps/agents-server/src/components/Homepage/buildMazeOfficeLayout.test.ts
PASS src/transpilers/openai-agents/OpenAiAgentsTranspiler.test.ts (17.663 s)
PASS src/transpilers/e2b/E2BTranspiler.test.ts
PASS apps/agents-server/src/components/Homepage/loadFederatedServerAgents.test.ts
PASS src/commitments/ACTION/ACTION.test.ts
PASS src/commitments/MODEL/MODEL.test.ts
PASS apps/agents-server/src/utils/transpilers/getTranspiledAgentExportWarnings.test.ts
FAIL src/commitments/index.test.ts
  ● COMMITMENT_REGISTRY singular/plural order › keeps the singular commitment before the plural alias

    expect(received).toBeGreaterThanOrEqual(expected)

    Expected: >= 0
    Received:    -1

    [0m [90m 33 |[39m             )[33m;[39m
     [90m 34 |[39m
    [31m[1m>[22m[39m[90m 35 |[39m             expect(singularIndex)[33m.[39mtoBeGreaterThanOrEqual([35m0[39m)[33m;[39m
     [90m    |[39m                                   [31m[1m^[22m[39m
     [90m 36 |[39m             expect(pluralIndex)[33m.[39mtoBeGreaterThanOrEqual([35m0[39m)[33m;[39m
     [90m 37 |[39m             expect(singularIndex)[33m.[39mtoBeLessThan(pluralIndex)[33m;[39m
     [90m 38 |[39m         }[0m

      at Object.<anonymous> (src/commitments/index.test.ts:35:35)

FAIL src/commitments/_common/getAllCommitmentDefinitions.test.ts
  ● getAllCommitmentDefinitions › puts low-level commitments at the end of the completion catalogue

    expect(received).toEqual(expected) // deep equality

    - Expected  - 2
    + Received  + 2

      Array [
        "GOAL",
    +   "GOALS",
        "RULE",
    -   "KNOWLEDGE",
    -   "TEAM",
    +   "RULES",
      ]

    [0m [90m 11 |[39m         [36mconst[39m languagesIndex [33m=[39m commitmentDefinitions[33m.[39mfindIndex(({ type }) [33m=>[39m type [33m===[39m [32m'LANGUAGES'[39m)[33m;[39m
     [90m 12 |[39m
    [31m[1m>[22m[39m[90m 13 |[39m         expect(commitmentDefinitions[33m.[39mslice([35m0[39m[33m,[39m [35m4[39m)[33m.[39mmap(({ type }) [33m=>[39m type))[33m.[39mtoEqual([
     [90m    |[39m                                                                           [31m[1m^[22m[39m
     [90m 14 |[39m             [32m'GOAL'[39m[33m,[39m
     [90m 15 |[39m             [32m'RULE'[39m[33m,[39m
     [90m 16 |[39m             [32m'KNOWLEDGE'[39m[33m,[39m[0m

      at Object.<anonymous> (src/commitments/_common/getAllCommitmentDefinitions.test.ts:13:75)

PASS src/cli/cli-commands/coder/run.test.ts
  ●  process.exit called with "0"

    [0m [90m 23 |[39m         [36mtry[39m {
     [90m 24 |[39m             [36mawait[39m action([33m...[39margs)[33m;[39m
    [31m[1m>[22m[39m[90m 25 |[39m             [36mreturn[39m process[33m.[39mexit([35m0[39m)[33m;[39m
     [90m    |[39m                            [31m[1m^[22m[39m
     [90m 26 |[39m         } [36mcatch[39m (error) {
     [90m 27 |[39m             assertsError(error)[33m;[39m
     [90m 28 |[39m[0m

      at Command.exit (src/cli/cli-commands/common/handleActionErrors.ts:25:28)
      at Command.parseAsync (node_modules/commander/lib/command.js:1015:5)
      at Object.<anonymous> (src/cli/test/ptbk.test.ts:63:13)

> lint
> eslint src/ --max-warnings=0


C:\Users\me\work\ai\promptbook\apps\agents-server\src\app\agents\[agentName]\page.tsx
  359:60  warning  'isAuthenticated' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (0 errors, 1 warning)

ESLint found too many warnings (maximum: 0).
Verification step `lint` failed with code 1 and signal null.
    at ChildProcess.handleExit (C:\Users\me\work\ai\promptbook\scripts\run-codex-prompts\common\runGoScript\runBashScriptWithOutput.ts:88:29)
    at ChildProcess.emit (node:events:518:28)
    at ChildProcess.emit (node:domain:489:12)
    at Process.ChildProcess._handle.onexit (node:internal/child_process:293:12)
```

CODEX_PROMPT