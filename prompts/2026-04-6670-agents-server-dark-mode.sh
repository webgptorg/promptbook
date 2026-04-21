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
    exec --model gpt-5.4 \
    --local-provider none \
    --sandbox danger-full-access \
    -C /c/Users/me/work/ai/promptbook \
    <<'CODEX_PROMPT'

Add dark mode to agents server

-   There should be both dark and light mode
-   User can pick between system / dark / light mode using a toggle in the control panel, save this information in same place as other user preferences
-   By default, the app should follow the system theme
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing, go through all the pages of the agents server and identify all the components that need to be
    updated to support dark mode, and make sure to implement dark mode in a consistent way across all of them.
    -   Be aware that you need to do a dark mode for entire app and for all the components, for the components used from `src` pass the `theme` prop to the components, for example `<Chat theme="DARK" ... />`
    -   Be also aware that the you need consider app logo
    -   The app should look premium and well designed in both dark and light modes, so make sure to pay attention to the design details and make sure that the colors, contrast, and overall look and feel of the app is good in both modes.
-   You are working with the [Agents Server](apps/agents-server)
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
        0ms
1482/1661 src/utils/markdown/removeMarkdownLinks.ts 2.24ms
1483/1661 src/utils/markdown/splitMarkdownIntoSections.test.ts 3.39ms
1484/1661 src/utils/markdown/splitMarkdownIntoSections.ts 3.89ms
1485/1661 src/utils/markdown/trimCodeBlock.test.ts 4.02ms
1486/1661 src/utils/markdown/trimCodeBlock.ts 1.91ms
1487/1661 src/utils/markdown/trimEndOfCodeBlock.test.ts 2.26ms
1488/1661 src/utils/markdown/trimEndOfCodeBlock.ts 2.24ms
1489/1661 src/utils/misc/$getCurrentDate.ts 2.01ms
1490/1661 src/utils/misc/$Register.ts 4.97ms
1491/1661 src/utils/misc/aboutPromptbookInformation.ts 5.06ms
1492/1661 src/utils/misc/arrayableToArray.test.ts 2.85ms
1493/1661 src/utils/misc/arrayableToArray.ts 3.34ms
1494/1661 src/utils/misc/computeHash.test.ts 2.27ms
1495/1661 src/utils/misc/computeHash.ts 4.55ms
1496/1661 src/utils/misc/debounce.ts 1.66ms
1497/1661 src/utils/misc/emojis.ts 7.02ms
1498/1661 src/utils/misc/FromtoItems.ts 1.66ms
1499/1661 src/utils/misc/injectCssModuleIntoShadowRoot.tsx 3.99ms
1500/1661 src/utils/misc/parseNumber.test.ts 3.27ms
1501/1661 src/utils/misc/parseNumber.ts 3.37ms
1502/1661 src/utils/misc/xAboutPromptbookInformation.tsx 3.36ms
1503/1661 src/utils/normalization/capitalize.test.ts 1.76ms
1504/1661 src/utils/normalization/capitalize.ts 1.34ms
1505/1661 src/utils/normalization/constructImageFilename.test.ts 2.38ms
1506/1661 src/utils/normalization/constructImageFilename.ts 3.36ms
1507/1661 src/utils/normalization/decapitalize.test.ts 4.04ms
1508/1661 src/utils/normalization/decapitalize.ts 2.25ms
1509/1661 src/utils/normalization/DIACRITIC_VARIANTS_LETTERS.ts 5.61ms
1510/1661 src/utils/normalization/IKeywords.ts 1.59ms
1511/1661 src/utils/normalization/index.ts 1.02ms
1512/1661 src/utils/normalization/isValidKeyword.test.ts 1.91ms
1513/1661 src/utils/normalization/isValidKeyword.ts 2.13ms
1514/1661 src/utils/normalization/nameToUriPart.test.ts 2.38ms
1515/1661 src/utils/normalization/nameToUriPart.ts 2.40ms
1516/1661 src/utils/normalization/nameToUriParts.test.ts 2.44ms
1517/1661 src/utils/normalization/nameToUriParts.ts 1.87ms
1518/1661 src/utils/normalization/normalize-to-kebab-case.test.ts 2.61ms
1519/1661 src/utils/normalization/normalize-to-kebab-case.ts 3.09ms
1520/1661 src/utils/normalization/normalizeMessageText.test.ts 5.06ms
1521/1661 src/utils/normalization/normalizeMessageText.ts 2.12ms
1522/1661 src/utils/normalization/normalizeTo_camelCase.test.ts 1.99ms
1523/1661 src/utils/normalization/normalizeTo_camelCase.ts 5.64ms
1524/1661 src/utils/normalization/normalizeTo_PascalCase.test.ts 2.17ms
1525/1661 src/utils/normalization/normalizeTo_PascalCase.ts 2.77ms
1526/1661 src/utils/normalization/normalizeTo_SCREAMING_CASE.test.ts 2.52ms
1527/1661 src/utils/normalization/normalizeTo_SCREAMING_CASE.ts 11.29ms
1528/1661 src/utils/normalization/normalizeTo_snake_case.test.ts 2.33ms
1529/1661 src/utils/normalization/normalizeTo_snake_case.ts 1.95ms
1530/1661 src/utils/normalization/normalizeWhitespaces.test.ts 2.42ms
1531/1661 src/utils/normalization/normalizeWhitespaces.ts 4.75ms
1532/1661 src/utils/normalization/orderJson.test.ts 4.73ms
1533/1661 src/utils/normalization/orderJson.ts 2.28ms
1534/1661 src/utils/normalization/parseKeywords.test.ts 6.84ms
1535/1661 src/utils/normalization/parseKeywords.ts 2.71ms
1536/1661 src/utils/normalization/parseKeywordsFromString.test.ts 3.86ms
1537/1661 src/utils/normalization/parseKeywordsFromString.ts 2.45ms
1538/1661 src/utils/normalization/removeDiacritics.test.ts 2.54ms
1539/1661 src/utils/normalization/removeDiacritics.ts 6.18ms
1540/1661 src/utils/normalization/removeEmojis.test.ts 3.68ms
1541/1661 src/utils/normalization/removeEmojis.ts 1.90ms
1542/1661 src/utils/normalization/removeQuotes.test.ts 2.03ms
1543/1661 src/utils/normalization/removeQuotes.ts 2.17ms
1544/1661 src/utils/normalization/searchKeywords.test.ts 3.90ms
1545/1661 src/utils/normalization/searchKeywords.ts 2.15ms
1546/1661 src/utils/normalization/suffixUrl.test.ts 1.47ms
1547/1661 src/utils/normalization/suffixUrl.ts 1.81ms
1548/1661 src/utils/normalization/titleToName.test.ts 3.59ms
1549/1661 src/utils/normalization/titleToName.ts 4.14ms
1550/1661 src/utils/normalization/unwrapResult.test.ts 4.92ms
1551/1661 src/utils/normalization/unwrapResult.ts 6.39ms
1552/1661 src/utils/organization/___and___.ts 1.31ms
1553/1661 src/utils/organization/___or___.ts 1.10ms
1554/1661 src/utils/organization/$side_effect.ts 2.58ms
1555/1661 src/utils/organization/$sideEffect.ts 2.30ms
1556/1661 src/utils/organization/empty_object.ts 1.64ms
1557/1661 src/utils/organization/just_empty_object.ts 1.48ms
1558/1661 src/utils/organization/just.ts 1.53ms
1559/1661 src/utils/organization/keepImported.ts 2.26ms
1560/1661 src/utils/organization/keepTypeImported.ts 1.83ms
1561/1661 src/utils/organization/keepUnused.ts 2.35ms
1562/1661 src/utils/organization/preserve.ts 1.93ms
1563/1661 src/utils/organization/README.md 1.30ms
1564/1661 src/utils/organization/really_any.ts 1.91ms
1565/1661 src/utils/organization/really_unknown.ts 1.59ms
1566/1661 src/utils/organization/spaceTrim.ts 2.01ms
1567/1661 src/utils/organization/TODO_any.ts 2.67ms
1568/1661 src/utils/organization/TODO_narrow.ts 1.34ms
1569/1661 src/utils/organization/TODO_object.ts 1.17ms
1570/1661 src/utils/organization/TODO_remove_as.ts 1.61ms
1571/1661 src/utils/organization/TODO_string.ts 1.37ms
1572/1661 src/utils/organization/TODO_unknown.ts 1.27ms
1573/1661 src/utils/organization/TODO_USE.ts 2.03ms
1574/1661 src/utils/parameters/extractParameterNames.test.ts 2.66ms
1575/1661 src/utils/parameters/extractParameterNames.ts 2.76ms
1576/1661 src/utils/parameters/mapAvailableToExpectedParameters.test.ts 5.78ms
1577/1661 src/utils/parameters/mapAvailableToExpectedParameters.ts 5.27ms
1578/1661 src/utils/parameters/numberToString.test.ts 2.01ms
1579/1661 src/utils/parameters/numberToString.ts 2.20ms
1580/1661 src/utils/parameters/templateParameters.test.ts 4.63ms
1581/1661 src/utils/parameters/templateParameters.ts 4.45ms
1582/1661 src/utils/parameters/valueToString.test.ts 3.37ms
1583/1661 src/utils/parameters/valueToString.ts 3.23ms
1584/1661 src/utils/random/$generateBookBoilerplate.ts 6.55ms
1585/1661 src/utils/random/$randomAgentPersona.ts 3.43ms
1586/1661 src/utils/random/$randomAgentRule.ts 3.05ms
1587/1661 src/utils/random/$randomBase58.ts 2.17ms
1588/1661 src/utils/random/$randomFullnameWithColor.ts 3.16ms
1589/1661 src/utils/random/$randomItem.ts 1.73ms
1590/1661 src/utils/random/$randomSeed.ts 1.74ms
1591/1661 src/utils/random/$randomToken.ts 2.15ms
1592/1661 src/utils/random/CzechNamePool.ts 6.80ms
1593/1661 src/utils/random/EnglishNamePool.ts 6.06ms
1594/1661 src/utils/random/getNamePool.ts 2.17ms
1595/1661 src/utils/random/NamePool.ts 1.72ms
1596/1661 src/utils/serialization/$deepFreeze.ts 2.36ms
1597/1661 src/utils/serialization/asSerializable.test.ts 1.60ms
1598/1661 src/utils/serialization/asSerializable.ts 2.19ms
1599/1661 src/utils/serialization/checkSerializableAsJson.ts 4.89ms
1600/1661 src/utils/serialization/clonePipeline.ts 2.52ms
1601/1661 src/utils/serialization/deepClone.test.ts 2.46ms
1602/1661 src/utils/serialization/deepClone.ts 2.49ms
1603/1661 src/utils/serialization/exportJson.ts 3.89ms
1604/1661 src/utils/serialization/isSerializableAsJson.test.ts 2.71ms
1605/1661 src/utils/serialization/isSerializableAsJson.ts 2.45ms
1606/1661 src/utils/serialization/jsonStringsToJsons.test.ts 1.79ms
1607/1661 src/utils/serialization/jsonStringsToJsons.ts 2.55ms
1608/1661 src/utils/serialization/serializeToPromptbookJavascript.ts 3.83ms
1609/1661 src/utils/sets/difference.test.ts 2.10ms
1610/1661 src/utils/sets/difference.ts 1.81ms
1611/1661 src/utils/sets/intersection.test.ts 1.71ms
1612/1661 src/utils/sets/intersection.ts 2.41ms
1613/1661 src/utils/sets/union.test.ts 1.58ms
1614/1661 src/utils/sets/union.ts 1.58ms
1615/1661 src/utils/take/classes/TakeChain.ts 2.44ms
1616/1661 src/utils/take/interfaces/ITakeChain.ts 1.89ms
1617/1661 src/utils/take/interfaces/Takeable.ts 1.22ms
1618/1661 src/utils/take/take.test.ts 2.35ms
1619/1661 src/utils/take/take.ts 1.89ms
1620/1661 src/utils/toolCalls/getToolCallIdentity.ts 2.03ms
1621/1661 src/utils/toolCalls/mergeToolCalls.ts 7.59ms
1622/1661 src/utils/toolCalls/resolveToolCallIdempotencyKey.ts 3.01ms
1623/1661 src/utils/validators/email/isValidEmail.test.ts 3.76ms
1624/1661 src/utils/validators/email/isValidEmail.ts 1.46ms
1625/1661 src/utils/validators/filePath/isRootPath.test.ts 1.43ms
1626/1661 src/utils/validators/filePath/isRootPath.ts 1.63ms
1627/1661 src/utils/validators/filePath/isValidFilePath.test.ts 4.95ms
1628/1661 src/utils/validators/filePath/isValidFilePath.ts 3.10ms
1629/1661 src/utils/validators/javascriptName/isValidJavascriptName.test.ts 1.71ms
1630/1661 src/utils/validators/javascriptName/isValidJavascriptName.ts 1.73ms
1631/1661 src/utils/validators/parameterName/validateParameterName.test.ts 2.98ms
1632/1661 src/utils/validators/parameterName/validateParameterName.ts 3.60ms
1633/1661 src/utils/validators/semanticVersion/isValidPromptbookVersion.test.ts 1.73ms
1634/1661 src/utils/validators/semanticVersion/isValidPromptbookVersion.ts 1.88ms
1635/1661 src/utils/validators/semanticVersion/isValidSemanticVersion.test.ts 1.72ms
1636/1661 src/utils/validators/semanticVersion/isValidSemanticVersion.ts 1.99ms
1637/1661 src/utils/validators/url/extractUrlsFromText.test.ts 2.30ms
1638/1661 src/utils/validators/url/extractUrlsFromText.ts 3.42ms
1639/1661 src/utils/validators/url/isHostnameOnPrivateNetwork.test.ts 2.77ms
1640/1661 src/utils/validators/url/isHostnameOnPrivateNetwork.ts 4.51ms
1641/1661 src/utils/validators/url/isUrlOnPrivateNetwork.test.ts 1.78ms
1642/1661 src/utils/validators/url/isUrlOnPrivateNetwork.ts 2.79ms
1643/1661 src/utils/validators/url/isValidAgentUrl.test.ts 2.37ms
1644/1661 src/utils/validators/url/isValidAgentUrl.ts 2.53ms
1645/1661 src/utils/validators/url/isValidPipelineUrl.test.ts 2.12ms
1646/1661 src/utils/validators/url/isValidPipelineUrl.ts 2.40ms
1647/1661 src/utils/validators/url/isValidUrl.test.ts 2.69ms
1648/1661 src/utils/validators/url/isValidUrl.ts 2.41ms
1649/1661 src/utils/validators/url/normalizeDomainForMatching.test.ts 3.02ms
1650/1661 src/utils/validators/url/normalizeDomainForMatching.ts 2.68ms
1651/1661 src/utils/validators/uuid/isValidUuid.test.ts 1.89ms
1652/1661 src/utils/validators/uuid/isValidUuid.ts 1.75ms
1653/1661 src/version.ts 1.87ms
1654/1661 src/wizard/$getCompiledBook.ts 8.12ms
1655/1661 src/wizard/test/books/test.book.md 1.16ms
1656/1661 src/wizard/test/README.md 1.37ms
1657/1661 src/wizard/test/sub/books/test.book.md 1.38ms
1658/1661 src/wizard/test/sub/subsub/books/test.book.md 1.71ms
1659/1661 src/wizard/test/sub/subsub/subsubsub/books/test.book.md 1.47ms
1660/1661 src/wizard/test/sub/subsub/subsubsub/README.md 1.25ms
1661/1661 src/wizard/wizard.ts 8.40ms
CSpell: Files checked: 1661, Issues found: 0 in 0 files.

> promptbook@0.112.0-49 test-lint
> eslint src


> promptbook@0.112.0-49 test-types
> tsc

src/book-components/BookEditor/useBookEditorMonacoLanguage.test.ts(181,49): error TS2345: Argument of type '{ monaco: typeof import("C:/Users/me/work/ai/promptbook/node_modules/monaco-editor/esm/vs/editor/editor.api"); monacoEditor: editor.IStandaloneCodeEditor; }' is not assignable to parameter of type 'EnsureBookEditorMonacoLanguageForEditorProps'.
  Property 'theme' is missing in type '{ monaco: typeof import("C:/Users/me/work/ai/promptbook/node_modules/monaco-editor/esm/vs/editor/editor.api"); monacoEditor: editor.IStandaloneCodeEditor; }' but required in type 'EnsureBookEditorMonacoLanguageForEditorProps'.
Verification step `test-types` failed with code 2 and signal null.
    at ChildProcess.handleExit (C:\Users\me\work\ai\promptbook\scripts\run-codex-prompts\common\runGoScript\runBashScriptWithOutput.ts:88:29)
    at ChildProcess.emit (node:events:518:28)
    at ChildProcess.emit (node:domain:489:12)
    at Process.ChildProcess._handle.onexit (node:internal/child_process:293:12)
```

CODEX_PROMPT