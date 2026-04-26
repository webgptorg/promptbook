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
    exec --model gpt-5.4-mini \
    --local-provider none \
    --sandbox danger-full-access \
    -C /c/Users/me/work/ai/promptbook \
    <<'CODEX_PROMPT'

The `TEAM` should be reflected as a part of the transpiled code

-   When exporting agent which has `TEAM` the transpiled code should build-in the team members
-   The exported code should be self-contained and runnable without any additional configuration or running server
-   The team members can have another team members, bring entire team hierarchy into the transpiled code
-   Team members can be on external federated server
-   In the transpiled code there should be some clear way to identify the team members
-   It should be available through `export-as-transpiled-code` page
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
    -   Use the existing mechanisms to resolve the team members and their information, do not implement new logic if it can be reused from the existing codebase
    -   Also in the transpiled code do not duplicate same code for each team member, but export reusable code
-   You are doing this change for every transpiler
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)

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
        nts.ts 2.44ms
1503/1685 src/utils/markdown/removeMarkdownFormatting.test.ts 5.14ms
1504/1685 src/utils/markdown/removeMarkdownFormatting.ts 4.30ms
1505/1685 src/utils/markdown/removeMarkdownLinks.test.ts 2.21ms
1506/1685 src/utils/markdown/removeMarkdownLinks.ts 2.48ms
1507/1685 src/utils/markdown/splitMarkdownIntoSections.test.ts 10.35ms
1508/1685 src/utils/markdown/splitMarkdownIntoSections.ts 4.09ms
1509/1685 src/utils/markdown/trimCodeBlock.test.ts 10.31ms
1510/1685 src/utils/markdown/trimCodeBlock.ts 2.82ms
1511/1685 src/utils/markdown/trimEndOfCodeBlock.test.ts 2.39ms
1512/1685 src/utils/markdown/trimEndOfCodeBlock.ts 2.16ms
1513/1685 src/utils/misc/$getCurrentDate.ts 2.50ms
1514/1685 src/utils/misc/$Register.ts 5.84ms
1515/1685 src/utils/misc/aboutPromptbookInformation.ts 37.15ms
1516/1685 src/utils/misc/arrayableToArray.test.ts 2.19ms
1517/1685 src/utils/misc/arrayableToArray.ts 2.34ms
1518/1685 src/utils/misc/computeHash.test.ts 2.24ms
1519/1685 src/utils/misc/computeHash.ts 3.71ms
1520/1685 src/utils/misc/debounce.ts 2.19ms
1521/1685 src/utils/misc/emojis.ts 16.08ms
1522/1685 src/utils/misc/FromtoItems.ts 2.23ms
1523/1685 src/utils/misc/injectCssModuleIntoShadowRoot.tsx 5.37ms
1524/1685 src/utils/misc/parseNumber.test.ts 4.00ms
1525/1685 src/utils/misc/parseNumber.ts 4.41ms
1526/1685 src/utils/misc/xAboutPromptbookInformation.tsx 4.20ms
1527/1685 src/utils/normalization/capitalize.test.ts 1.96ms
1528/1685 src/utils/normalization/capitalize.ts 2.93ms
1529/1685 src/utils/normalization/constructImageFilename.test.ts 7.61ms
1530/1685 src/utils/normalization/constructImageFilename.ts 3.31ms
1531/1685 src/utils/normalization/decapitalize.test.ts 5.46ms
1532/1685 src/utils/normalization/decapitalize.ts 1.81ms
1533/1685 src/utils/normalization/DIACRITIC_VARIANTS_LETTERS.ts 12.20ms
1534/1685 src/utils/normalization/IKeywords.ts 3.85ms
1535/1685 src/utils/normalization/index.ts 1.66ms
1536/1685 src/utils/normalization/isValidKeyword.test.ts 2.53ms
1537/1685 src/utils/normalization/isValidKeyword.ts 3.16ms
1538/1685 src/utils/normalization/nameToUriPart.test.ts 4.27ms
1539/1685 src/utils/normalization/nameToUriPart.ts 3.26ms
1540/1685 src/utils/normalization/nameToUriParts.test.ts 4.14ms
1541/1685 src/utils/normalization/nameToUriParts.ts 2.92ms
1542/1685 src/utils/normalization/normalize-to-kebab-case.test.ts 2.80ms
1543/1685 src/utils/normalization/normalize-to-kebab-case.ts 4.28ms
1544/1685 src/utils/normalization/normalizeMessageText.test.ts 4.61ms
1545/1685 src/utils/normalization/normalizeMessageText.ts 3.19ms
1546/1685 src/utils/normalization/normalizeTo_camelCase.test.ts 2.44ms
1547/1685 src/utils/normalization/normalizeTo_camelCase.ts 13.88ms
1548/1685 src/utils/normalization/normalizeTo_PascalCase.test.ts 2.76ms
1549/1685 src/utils/normalization/normalizeTo_PascalCase.ts 2.81ms
1550/1685 src/utils/normalization/normalizeTo_SCREAMING_CASE.test.ts 4.57ms
1551/1685 src/utils/normalization/normalizeTo_SCREAMING_CASE.ts 5.36ms
1552/1685 src/utils/normalization/normalizeTo_snake_case.test.ts 7.23ms
1553/1685 src/utils/normalization/normalizeTo_snake_case.ts 3.54ms
1554/1685 src/utils/normalization/normalizeWhitespaces.test.ts 2.21ms
1555/1685 src/utils/normalization/normalizeWhitespaces.ts 2.43ms
1556/1685 src/utils/normalization/orderJson.test.ts 2.88ms
1557/1685 src/utils/normalization/orderJson.ts 2.76ms
1558/1685 src/utils/normalization/parseKeywords.test.ts 2.90ms
1559/1685 src/utils/normalization/parseKeywords.ts 7.49ms
1560/1685 src/utils/normalization/parseKeywordsFromString.test.ts 5.10ms
1561/1685 src/utils/normalization/parseKeywordsFromString.ts 4.63ms
1562/1685 src/utils/normalization/removeDiacritics.test.ts 3.13ms
1563/1685 src/utils/normalization/removeDiacritics.ts 2.42ms
1564/1685 src/utils/normalization/removeEmojis.test.ts 6.59ms
1565/1685 src/utils/normalization/removeEmojis.ts 2.94ms
1566/1685 src/utils/normalization/removeQuotes.test.ts 11.24ms
1567/1685 src/utils/normalization/removeQuotes.ts 5.88ms
1568/1685 src/utils/normalization/searchKeywords.test.ts 5.14ms
1569/1685 src/utils/normalization/searchKeywords.ts 2.68ms
1570/1685 src/utils/normalization/suffixUrl.test.ts 4.48ms
1571/1685 src/utils/normalization/suffixUrl.ts 2.50ms
1572/1685 src/utils/normalization/titleToName.test.ts 2.82ms
1573/1685 src/utils/normalization/titleToName.ts 9.15ms
1574/1685 src/utils/normalization/unwrapResult.test.ts 13.55ms
1575/1685 src/utils/normalization/unwrapResult.ts 9.67ms
1576/1685 src/utils/organization/___and___.ts 1.86ms
1577/1685 src/utils/organization/___or___.ts 4.31ms
1578/1685 src/utils/organization/$side_effect.ts 4.20ms
1579/1685 src/utils/organization/$sideEffect.ts 6.37ms
1580/1685 src/utils/organization/empty_object.ts 2.01ms
1581/1685 src/utils/organization/just_empty_object.ts 2.00ms
1582/1685 src/utils/organization/just.ts 2.91ms
1583/1685 src/utils/organization/keepImported.ts 2.93ms
1584/1685 src/utils/organization/keepTypeImported.ts 2.25ms
1585/1685 src/utils/organization/keepUnused.ts 4.17ms
1586/1685 src/utils/organization/preserve.ts 3.83ms
1587/1685 src/utils/organization/README.md 4.40ms
1588/1685 src/utils/organization/really_any.ts 2.44ms
1589/1685 src/utils/organization/really_unknown.ts 2.22ms
1590/1685 src/utils/organization/spaceTrim.ts 3.59ms
1591/1685 src/utils/organization/TODO_any.ts 1.75ms
1592/1685 src/utils/organization/TODO_narrow.ts 1.87ms
1593/1685 src/utils/organization/TODO_object.ts 2.59ms
1594/1685 src/utils/organization/TODO_remove_as.ts 7.49ms
1595/1685 src/utils/organization/TODO_string.ts 1.67ms
1596/1685 src/utils/organization/TODO_unknown.ts 1.80ms
1597/1685 src/utils/organization/TODO_USE.ts 2.78ms
1598/1685 src/utils/parameters/extractParameterNames.test.ts 4.56ms
1599/1685 src/utils/parameters/extractParameterNames.ts 3.59ms
1600/1685 src/utils/parameters/mapAvailableToExpectedParameters.test.ts 7.22ms
1601/1685 src/utils/parameters/mapAvailableToExpectedParameters.ts 11.32ms
1602/1685 src/utils/parameters/numberToString.test.ts 3.84ms
1603/1685 src/utils/parameters/numberToString.ts 8.18ms
1604/1685 src/utils/parameters/templateParameters.test.ts 8.41ms
1605/1685 src/utils/parameters/templateParameters.ts 8.69ms
1606/1685 src/utils/parameters/valueToString.test.ts 6.35ms
1607/1685 src/utils/parameters/valueToString.ts 6.83ms
1608/1685 src/utils/random/$generateBookBoilerplate.ts 11.36ms
1609/1685 src/utils/random/$randomAgentPersona.ts 15.79ms
1610/1685 src/utils/random/$randomAgentRule.ts 5.64ms
1611/1685 src/utils/random/$randomBase58.ts 3.21ms
1612/1685 src/utils/random/$randomFullnameWithColor.ts 7.05ms
1613/1685 src/utils/random/$randomItem.ts 3.57ms
1614/1685 src/utils/random/$randomSeed.ts 2.34ms
1615/1685 src/utils/random/$randomToken.ts 4.29ms
1616/1685 src/utils/random/CzechNamePool.ts 8.75ms
1617/1685 src/utils/random/EnglishNamePool.ts 6.71ms
1618/1685 src/utils/random/getNamePool.ts 3.24ms
1619/1685 src/utils/random/NamePool.ts 2.59ms
1620/1685 src/utils/serialization/$deepFreeze.ts 3.47ms
1621/1685 src/utils/serialization/asSerializable.test.ts 2.43ms
1622/1685 src/utils/serialization/asSerializable.ts 3.05ms
1623/1685 src/utils/serialization/checkSerializableAsJson.ts 5.84ms
1624/1685 src/utils/serialization/clonePipeline.ts 4.35ms
1625/1685 src/utils/serialization/deepClone.test.ts 3.12ms
1626/1685 src/utils/serialization/deepClone.ts 3.23ms
1627/1685 src/utils/serialization/exportJson.ts 4.49ms
1628/1685 src/utils/serialization/isSerializableAsJson.test.ts 3.89ms
1629/1685 src/utils/serialization/isSerializableAsJson.ts 4.93ms
1630/1685 src/utils/serialization/jsonStringsToJsons.test.ts 3.10ms
1631/1685 src/utils/serialization/jsonStringsToJsons.ts 3.30ms
1632/1685 src/utils/serialization/serializeToPromptbookJavascript.ts 5.43ms
1633/1685 src/utils/sets/difference.test.ts 3.88ms
1634/1685 src/utils/sets/difference.ts 2.44ms
1635/1685 src/utils/sets/intersection.test.ts 2.17ms
1636/1685 src/utils/sets/intersection.ts 2.89ms
1637/1685 src/utils/sets/union.test.ts 2.12ms
1638/1685 src/utils/sets/union.ts 2.56ms
1639/1685 src/utils/take/classes/TakeChain.ts 4.30ms
1640/1685 src/utils/take/interfaces/ITakeChain.ts 2.72ms
1641/1685 src/utils/take/interfaces/Takeable.ts 1.87ms
1642/1685 src/utils/take/take.test.ts 7.17ms
1643/1685 src/utils/take/take.ts 3.05ms
1644/1685 src/utils/toolCalls/getToolCallIdentity.ts 2.72ms
1645/1685 src/utils/toolCalls/mergeToolCalls.ts 9.26ms
1646/1685 src/utils/toolCalls/resolveToolCallIdempotencyKey.ts 8.44ms
1647/1685 src/utils/validators/email/isValidEmail.test.ts 2.71ms
1648/1685 src/utils/validators/email/isValidEmail.ts 2.26ms
1649/1685 src/utils/validators/filePath/isRootPath.test.ts 2.33ms
1650/1685 src/utils/validators/filePath/isRootPath.ts 2.74ms
1651/1685 src/utils/validators/filePath/isValidFilePath.test.ts 6.26ms
1652/1685 src/utils/validators/filePath/isValidFilePath.ts 3.63ms
1653/1685 src/utils/validators/javascriptName/isValidJavascriptName.test.ts 2.41ms
1654/1685 src/utils/validators/javascriptName/isValidJavascriptName.ts 2.50ms
1655/1685 src/utils/validators/parameterName/validateParameterName.test.ts 6.93ms
1656/1685 src/utils/validators/parameterName/validateParameterName.ts 9.67ms
1657/1685 src/utils/validators/semanticVersion/isValidPromptbookVersion.test.ts 2.60ms
1658/1685 src/utils/validators/semanticVersion/isValidPromptbookVersion.ts 4.74ms
1659/1685 src/utils/validators/semanticVersion/isValidSemanticVersion.test.ts 2.34ms
1660/1685 src/utils/validators/semanticVersion/isValidSemanticVersion.ts 2.89ms
1661/1685 src/utils/validators/url/extractUrlsFromText.test.ts 2.99ms
1662/1685 src/utils/validators/url/extractUrlsFromText.ts 4.77ms
1663/1685 src/utils/validators/url/isHostnameOnPrivateNetwork.test.ts 3.65ms
1664/1685 src/utils/validators/url/isHostnameOnPrivateNetwork.ts 5.74ms
1665/1685 src/utils/validators/url/isUrlOnPrivateNetwork.test.ts 2.47ms
1666/1685 src/utils/validators/url/isUrlOnPrivateNetwork.ts 3.15ms
1667/1685 src/utils/validators/url/isValidAgentUrl.test.ts 2.70ms
1668/1685 src/utils/validators/url/isValidAgentUrl.ts 3.13ms
1669/1685 src/utils/validators/url/isValidPipelineUrl.test.ts 2.59ms
1670/1685 src/utils/validators/url/isValidPipelineUrl.ts 3.10ms
1671/1685 src/utils/validators/url/isValidUrl.test.ts 3.76ms
1672/1685 src/utils/validators/url/isValidUrl.ts 3.03ms
1673/1685 src/utils/validators/url/normalizeDomainForMatching.test.ts 2.41ms
1674/1685 src/utils/validators/url/normalizeDomainForMatching.ts 3.65ms
1675/1685 src/utils/validators/uuid/isValidUuid.test.ts 3.09ms
1676/1685 src/utils/validators/uuid/isValidUuid.ts 2.32ms
1677/1685 src/version.ts 2.50ms
1678/1685 src/wizard/$getCompiledBook.ts 12.03ms
1679/1685 src/wizard/test/books/test.book.md 2.10ms
1680/1685 src/wizard/test/README.md 1.90ms
1681/1685 src/wizard/test/sub/books/test.book.md 2.01ms
1682/1685 src/wizard/test/sub/subsub/books/test.book.md 2.45ms
1683/1685 src/wizard/test/sub/subsub/subsubsub/books/test.book.md 2.33ms
1684/1685 src/wizard/test/sub/subsub/subsubsub/README.md 1.77ms
1685/1685 src/wizard/wizard.ts 9.70ms
CSpell: Files checked: 1685, Issues found: 0 in 0 files.

> promptbook@0.112.0-54 test-lint
> eslint src


C:\Users\me\work\ai\promptbook\src\transpilers\_common\TranspiledTeamMember.ts
  320:48  error  Parsing error: ',' expected

C:\Users\me\work\ai\promptbook\src\transpilers\anthropic-claude-sdk\AnthropicClaudeSdkTranspiler.ts
  229:37  error  Parsing error: Invalid character

C:\Users\me\work\ai\promptbook\src\transpilers\openai-sdk\OpenAiSdkTranspiler.ts
  203:37  error  Parsing error: Invalid character

✖ 3 problems (3 errors, 0 warnings)

Verification step `test-lint` failed with code 1 and signal null.
    at ChildProcess.handleExit (C:\Users\me\work\ai\promptbook\scripts\run-codex-prompts\common\runGoScript\runBashScriptWithOutput.ts:88:29)
    at ChildProcess.emit (node:events:518:28)
    at ChildProcess.emit (node:domain:489:12)
    at Process.ChildProcess._handle.onexit (node:internal/child_process:293:12)
```

CODEX_PROMPT