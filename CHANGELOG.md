# ⌚ Changelog

## Released versions

### `0.20.0` _(2023-12-29)_

-   Change keyword `USE` to `MODEL VARIANT`
-   Allow to specify exact model eg. `MODEL NAME gpt-4-1106-preview`

### `0.20.1` _(2024-01-15)_

-   Add postprocessing function `trimEndOfCodeBlock`

### `0.20.2` _(2024-01-16)_

-   `replaceParameters` works with inlined JSONs

### `0.23.0` _(2024-01-25)_

-   You are able to send markdown code block in prompts _(without traces of escaping)_
-   Postprocessing function `trimEndOfCodeBlock` is not working with escaped code blocks JUST with markdown code blocks
-   Rename `extractBlocksFromMarkdown` to `extractAllBlocksFromMarkdown`

### `0.24.0` _(2024-01-25)_

-   Add postprocessing function `trimCodeBlock`
-   Add `EXPECT` command to promptbooks
-   Add `ExecutionReport`
-   Add `parseNumber` utility function
-   `PtbkExecutor` returns richer result and does not throw, just returns `isSuccessful=false`, You can use `assertsExecutionSuccessful` utility function to check if the execution was successful
-   Add `assertsExecutionSuccessful` utility function

### `0.25.0` _(2024-02-03)_

-   `CreatePtbkExecutorSettings` are not mandatory anymore

### `0.26.0` _(2024-02-03)_

-   Add `EXPECT JSON` command to promptbooks
-   Split internal representation `EXPECT` into `EXPECT_AMOUNT` and `EXPECT_FORMAT`

### `0.27.0` _(2024-02-03)_

Moving logic from `promptbookStringToJson` to `createPtbkExecutor`

-   Allow postprocessing and expectations in all execution types
-   Postprocessing is happening before checking expectations
-   In `PromptbookJson` postprocessing is represented internally in each `PromptTemplateJson` not as separate `PromptTemplateJson`
-   Introduce `ExpectError`
-   Rename `maxNaturalExecutionAttempts` to `maxExecutionAttempts` (because now it is not just for natural execution)
-   If title in promptbook contains emojis, pass it innto report
-   Fix `description` in report
-   Asking user infinite times for input if the input not matches the expectations

### `0.28.0` _(2024-02-05)_

Better execution report in markdown format

-   Add `JOKER {foo}` as a way how to skip part of the promptbook
-   Split `UserInterfaceToolsPromptDialogOptions.prompt` into `promptTitle` and `promptMessage`
-   Add `UserInterfaceToolsPromptDialogOptions.priority`
-   Add timing information to report
-   Maximum must be higher than minimum in `EXPECT` statement
-   Maximum 0 is not valid, should be at least 1 in `EXPECT` statement

### `0.29.0` _(2024-02-06)_

-   Allow to use custom postprocessing functions
-   Allow async postprocessing functions

### 0.30.0 _(2024-02-09)_

-   Remove `Promptbook` _(just using JSON `PromptbookJson` format)_
    -   `CreatePtbkExecutorOptions` has `PromptbookJson`
-   Promptbooks are executed in parallel
    -   `PromptTemplateJson` contains `dependentParameterNames`
    -   `validatePromptbookJson` is checking for circular dependencies
    -   Test that joker is one of the dependent parameters

### `0.31.0` _(2024-02-12)_

Better execution reports

-   Filter out voids in `executionReportJsonToString`
-   Add timing information to `ExecutionReportJson` _(In both text and chart format)_
-   Add money cost information to `ExecutionReportJson` _(In both text and chart format)_
-   Escape code blocks in markdown
-   Do not export `replaceParameters` utility function

### `0.32.0` _(2024-02-12)_

Export less functions from `@promptbook/utils`

### ~~0.33.0~~ _(Skipped)_

~~Iterating over parameters~~

-   ~~Parameters can be both `string` and `Array<string>`~~
    -   ~~`Array<string>` will itterate over all values~~
    -   ~~You can use postprocessing functions or `EXECUTE SCRIPT` to split string into array and vice versa~~

### `0.34.0` _(2024-02-19)_

-   Do not remove emojis or formatting from task title in progress

### `0.35.0` _(2024-03-01)_

-   You can use `prettifyMarkdown` for postprocessing

### `0.35.1` _(2024-03-06)_

-   Add Mermaid graph to sample promptbooks
-   Fix spelling errors in OpenAI error messages

### `0.36.0` _(2024-03-06)_

Cleanup and renaming

-   Cleanup the project
-   Do not export unused types from `@promptbook/types`
-   Rename "Prompt template pipelines" to more meaningful "Promptbooks"
-   Remove `DEFAULT_MODEL_REQUIREMENTS` - You need to explicitly specify the requirements
-   Rename `PromptTemplatePipelineLibrary` -> `PromptbookLibrary`
-   Rename `RemoteServerOptions`.`ptbkLibrary` -> `library`
-   Add `RemoteServerOptions`.`ptbkNames`
-   Rename `RemoteServerOptions`.`getPtp` -> `getPtbkByName`
-   Do not use shortcut "Ptbk" but full "Promptbook" name in the code, classes, methods, etc.
-   Change command `PTBK_URL` to `URL` _(but keep backward compatibility and preserve alias `PTBK`)_
-   Change command `PTBK_NAME` to `PROMPTBOOK_NAME` _(but keep backward compatibility and preserve alias `PTBK`)_
-   Rename `runRemoteServer` -> `startRemoteServer` and return `Destroyable` object

### `0.37.0` _(2024-03-08)_

Explicit output parameters

-   Every promptbook has to have `OUTPUT PARAMETER` property in header

### `0.38.0` _(2024-03-09)_

Remove "I" prefix from interfaces and change interfaces to types.

-   Rename `IAutomaticTranslator` -> `AutomaticTranslator`
-   Rename `ITranslatorOptions` -> `TranslatorOptions`
-   Rename `IGoogleAutomaticTranslatorOptions` -> `GoogleAutomaticTranslatorOptions`
-   Rename `ILindatAutomaticTranslatorOptions` -> `LindatAutomaticTranslatorOptions`
-   Remove unused `IPersonProfile`
-   Remove unused `ILicense`
-   Remove unused `IRepository`

_Note: Keeping "I" prefix in internal tooling like `IEntity`, `IExecCommandOptions`, `IExecCommandOptions`_
_Note: Also keeping stuff imported from external libraries like `IDestroyable`_

### `0.39.0` _(2024-03-09)_

Working on **Promptbook Library**. Identify promptbooks by URL.

-   Change `PromptbookLibrary` class to interface
-   Add `SimplePromptbookLibrary` class which implements `PromptbookLibrary`
-   Rename `PromptbookLibrary.promptbookNames` to `PromptbookLibrary.pipelineUrls`
-   Remove `PromptbookLibrary.createExecutor` to separate responsibility
-   Make more renamings and reorganizations in `PromptbookLibrary`
-   Make `PromptbookLibrary.listPipelines` async method
-   Make `PromptbookLibrary.getPipelineByUrl` async method

### `0.40.0` _(2024-03-10)_

Multiple factories for `PromptbookLibrary`, Custom errors, enhance templating

-   Throwing `NotFoundError`
-   Throwing `PromptbookSyntaxError`
-   Throwing `PromptbookLogicError`
-   Throwing `PromptbookExecutionError`
-   Throwing `PromptbookReferenceError`
-   Throwing `UnexepctedError`
-   Preserve col-chars in multi-line templates, See more in `replaceParameters` unit test
-   Change static methods of `PromptbookLibrary` to standalone functions
-   Static method `createPromptbookLibraryFromSources` receives spreaded arguments `Array` instead of `Record`
-   Add factory function `createPromptbookLibraryFromPromise`

### `0.41.0` _(2024-03-23)_

More options to create `PromptbookLibrary`

-   Utility `createPromptbookLibraryFromDirectory`
-   Utility `createPromptbookLibraryFromUrl`
-   Add `extractBlock` to build-in functions
-   Remove problematic usage of `chalk` and use `colors` instead
-   Export `replaceParameters` from `@promptbook/utils`

### `0.42.0` _(2024-03-24)_

Better logo and branding of Promptbook.

### `0.43.0` _(2024-03-26)_

CLI utils exported from `@promptbook/cli`

After install you can use `promptbook` command in terminal:

```bash
npm i @promptbook/utils
npx ptbk prettify 'promptbook/**/*.ptbk.md'
```

### `0.44.0` _(2024-04-26)_

-   Lower bundle size
-   Normalization library `n12` is not used and all its functions are bringed to `@promptbook/utils`
-   Better error names
-   Better error used
-   Make `ExpectError` private
-   `@promptbook/core` is not be peer dependency of `@promptbook/utils`
-   Rename `expectAmount` in json to `expectations`
-   Expectations are passed into prompt object and used in natural tools
-   Add `MockedFackedLlmExecutionTools`
-   Add utils `checkExpectations` and `isPassingExpectations`
-   Better error messages from `JavascriptEvalExecutionTools`
-   Each exported NPM package has full README
-   `spaceTrim` is re-exported from `@promptbook/utils`

### `0.45.0` _(2024-04-27)_

More direct usage of OpenAI API, Refactoring

-   Pass directly Open AI otpions to `OpenAiExecutionTools`
    -   Change `openAiApiKey` -> `apiKey` when creating new `OpenAiExecutionTools`
-   Change all import statements to import type when importing just types

### `0.46.0` _(2024-04-28)_

Reorganize packages

> 💡 Now you can just install `promptbook` or `ptbk` as alias for everything

-   New package `promptbook` as a link to all other packages
-   New package `ptbk` as an alias to `promptbook`
-   New package `@promptbook/fake-llm`
    -   Move there `MockedEchoLlmExecutionTools` and `MockedFackedLlmExecutionTools` from `@promptbook/core`
-   New package `@promptbook/langtail` to prepare for [Langtail](https://langtail.com/) integration

### `0.47.0` _(2024-05-02)_

Tools refactoring

-   Rename "natural" -> "llm"
-   Allow to pass multiple `llm` into `ExecutionTools` container
-   Export `renderPromptbookMermaid` through `@promptbook/utils`

### `0.48.0` and `0.49.0` _(2024-05-08)_

Better utilities (for Promptbase app)

-   Add reverse utility the `promptbookJsonToString`
-   Allow to put link callback into `renderPromptbookMermaid`
-   Better prompt template identification
-   Add function `titleToName` exported from `@promptbook/utils`
<!-- [👜] -   Add function `findUsableParameters` exported from `@promptbook/utils` -->
-   Add function `renameParameter` exported from `@promptbook/utils`
-   Rename "Script Template" to just "Script"

### `0.50.0` _(2024-05-17)_

Was accidentally released as earlier, re-released fully completed as `0.51.0`

### `0.51.0` _(2024-05-24)_

Add new OpenaAI models `gpt-4o` and `gpt-4o-2024-05-13`

-   Add model `gpt-4o`
-   Add model `gpt-4o-2024-05-13`
-   Classes that implements `LlmExecutionTools` must expose compatible models
-   List OpenAI models dynamically
-   All GPT models have pricing information
-   Export `OPENAI_MODELS` from `@promptbook/openai`
-   Export types `LlmTemplateJson`, `SimpleTemplateJson`, `ScriptJson`, `PromptDialogJson`, `Expectations` from `@promptbook/types`
-   `ModelRequirements.modelName` is not required anymore
-   `PromptbookExecutor` does not require `onProgress` anymore
-   `ExecutionTools` does not require `userInterface` anymore, when not set, the user interface is disabled and promptbook which requires user interaction will fail
-   Export `extractParameters`, `extractVariables` and `extractParametersFromPromptTemplate` from `@promptbook/utils`
-   Add and export set operations `difference`, `intersection` and `union` from `@promptbook/utils`
-   Export `POSTPROCESSING_FUNCTIONS` from `@promptbook/execute-javascript`
-   No need to specify MODEL VARIANT and MODEL NAME in .ptbk.md explicitly, CHAT VARIANT will be used as default

### `0.52.0` _(2024-06-06)_

Add support for Claude \\ Anthropic models via package `@promptbook/anthropic-claude` and add Azure OpenAI models via package `@promptbook/azure-openai`

-   Export `MultipleLlmExecutionTools` from `@promptbook/core`
-   Always use "modelName" not just "model"
-   Standartization of model providers
-   Delete `@promptbook/wizzard`
-   Move `assertsExecutionSuccessful`,`checkExpectations`,`executionReportJsonToString`,`ExecutionReportStringOptions`,`ExecutionReportStringOptionsDefaults`,`isPassingExpectations`,`prettifyPromptbookString` from `@promptbook/utils` to `@promptbook/core`
-   Make and use `JavascriptExecutionTools` as placeholder for better implementation with propper sandboxing
-   Implement `createPromptbookLibraryFromDirectory` export from `@promptbook/core`
-   Make `PromptbookLibraryError`
-   Check Promptbook URL uniqueness in `SimplePromptbookLibrary` _(see [🦄])_
-   Util `createPromptbookLibraryFromPromise` is not public anymore
-   Util `forEachAsync` export from `@promptbook/utils`

### `0.53.0` _(2024-06-08)_

Repair and organize imports

### `0.54.0` _(2024-06-08)_

-   Custom errors `ExpectError`,`NotFoundError`,`PromptbookExecutionError`,`PromptbookLogicError`,`PromptbookLibraryError`,`PromptbookSyntaxError` exported from `@promptbook/core`

### `0.55.0` _(2024-06-15)_

Better usage computation and shape

-   Change shape of `PromptResult.usage`
-   Remove types `number_positive_or_zero` and `number_negative_or_zero`
-   Export type `PromptResultUsage`, `PromptResultUsageCounts` and `UncertainNumber` from `@promptbook/types`
-   Export util `addUsage` from `@promptbook/core`
-   Put usage directly in result of each execution
-   Export function `usageToWorktime` from `@promptbook/core`

### `0.56.0` _(2024-06-16)_

Rename and reorganize libraries

-   Take `createPromptbookLibraryFromDirectory` from `@promptbook/core` -> `@promptbook/node` (to avoid dependency risk errors)
-   Rename `@promptbook/fake-llmed` -> `@promptbook/fake-llm`
-   Export `PROMPTBOOK_ENGINE_VERSION` from each package
-   Use `export type` in `@promptbook/types`

### `0.57.0` _(2024-06-15)_

Better JSON Mode

-   `OpenAiExecutionTools` will use JSON mode natively
-   `OpenAiExecutionTools` Do not fail on empty _(but valid string)_ responses

### `0.58.0` _(2024-06-26)_

-   Internal reorganization of folders and files
-   Export types as type export

### `0.59.0` _(2024-06-30)_

Preparation for system for [management of external knowledge](https://github.com/webgptorg/promptbook/discussions/41) (RAG), vector embeddings and propper building of pipeline collection.

-   Add `MaterialKnowledgePieceJson`
-   Add `KnowledgeJson`
-   Add `prepareKnowledgeFromMarkdown` exported from `@promptbook/core`
-   Change `promptbookStringToJson` to async function (and add `promptbookStringToJsonSync` for promptbooks without external knowledge)
-   Change `createPromptbookLibraryFromSources` to `createPromptbookLibraryFromJson` and allow only compiled jsons as input + it is not `async` anymore
-   Allow only jsons as input in `createLibraryFromPromise`
-   Class `SimplePromptbookLibrary` not exposed at all, only type `PromptbookLibrary` and constructors
-   Rename all `createPromptbookLibraryFromXyz` to `createLibraryFromXyz`
-   Misc Tool classes not requires options anymore _(like `CallbackInterfaceTools`, `OpenAiExecutionTools`, `AnthropicClaudeExecutionTools`, etc.)_
-   Add util `libraryToJson` exported from `@promptbook/core`
-   CLI util `ptbk make ...` can convert promptbooks to JSON
-   `promptbookStringToJson` automatically looks for `promptbook-collection.json` in root of given directory
-   Rename `validatePromptbookJson` to `validatePromptbook`
-   Create `embed` method on LLM tools, `PromptEmbeddingResult`, `EmbeddingVector` and `embeddingVectorToString`
-   `createLibraryFromDirectory` still DONT use prebuild library (just detects it)

### `0.60.0` _(2024-07-15)_

Renaming and making names more consistent and less disambigous

-   Rename word "promptbook"
    -   Keep name **"Promptbook"** as name for this project.
    -   Rename promptbook as pipeline of templates defined in `.ptbk.md` to **"pipeline"**
-   Rename word "library"
    -   For library used as a collection of templates use name **"collection"**
    -   For library used as this project and package use word **"package"**
-   Rename methods in `LlmExecutionTools`
    -   `gptChat` -> `callChatModel`
    -   `gptComplete` -> `callCompletionModel`
-   Rename custom errors
-   Rename folder `promptbook-collection` -> `promptbook-collection`
-   In CLI you ca use both `promptbook` and `ptbk`

### `0.61.0` _(2024-07-8)_

Big syntax additions
Working external knowledge, personas, preparation for instruments and actions

-   Add reserved parameter names
-   Add `SAMPLE` command with notation for parameter samples to `.ptbk.md` files
-   Add `KNOWLEDGE` command to `.ptbk.md` files
-   Change `EXECUTE` command to `BLOCK` command
-   Change `executionType` -> `templateType`
-   Rename `SynraxError` to `ParsingError`
-   Rename `extractParameters` to `extractParameterNames`
-   Rename `ExecutionError` to `PipelineExecutionError`
-   Remove `TemplateError` and replace with `ExecutionError`
-   Allow deep structure (h3, h4,...) in `.ptbk.md` files
-   Add `callEmbeddingModel` to `LlmExecutionTools`
-   `callChatModel` and `callCompletionModel` are not required to be implemented in `LlmExecutionTools` anymore
-   Remove `MultipleLlmExecutionTools` and make `joinLlmExecutionTools` function
-   You can pass simple array of `LlmExecutionTools` into `ExecutionTools` and it will be joined automatically via `joinLlmExecutionTools`
-   Remove the `MarkdownStructure` and replace by simpler solution `flattenMarkdown` + `splitMarkdownIntoSections` + `parseMarkdownSection` which works just with markdown strings and export from `@promptbook/utils` <- [🕞]
-   Markdown utils are exported through `@promptbook/markdown-utils` _(and removed from `@promptbook/utils`)_
-   String normalizers goes alongside with types; for example `normalizeTo_SCREAMING_CASE` -> `string_SCREAMING_CASE`
-   Export `isValidUrl`, `isValidPipelineUrl`, `isValidFilePath`, `isValidJavascriptName`, `isValidSemanticVersion`, `isHostnameOnPrivateNetwork`, `isUrlOnPrivateNetwork` and `isValidUuid` from `@promptbook/utils`
-   Add `systemMessage`, `temperature` and `seed` to `ModelRequirements`
-   Code blocks can be noteted both by ``` and >
-   Add caching and storage
-   Export utity `stringifyPipelineJson` to stringify `PipelineJson` with pretty formatting of loooooong knowledge indexes from `@promptbook/core`

### `0.62.0` _(2024-07-8)_

[🎐] Better work with usage

-   Add usage to preparations and reports
-   Export function `usageToHuman` from `@promptbook/core`
-   Rename `TotalCost` to `TotalUsage`
-   Allow to reload cache
-   Fix error in `uncertainNumber` which always returned "uncertain 0"
-   [🐞] Fix usage counting in `OpenAiExecutionTools`

### `0.63.0` _(2024-08-11)_

Better system for imports, exports and dependencies

-   Manage package exports automatically
-   Automatically export all types from `@promptbook/types`
-   Protext runtime-specific code - for example protect browser-specific to never reach `@promptbook/node`
-   Consiese README - move things to discussions
-   Make Partial<ModelRequirements> and optional

### `0.64.0`

Was accidentally released skipped

### `0.65.0` _(2024-08-15-)_

[🍜] Anonymous server

-   Anonymous server
-   `LlmConfiguration` and `createLlmToolsFromConfiguration`
-   Better names for knowledge sources
-   Rename keys inside prepared knowledge
-   Use `MultipleLlmExecutionTools` more
-   LLM tools providers have constructor functions, for example `OpenAiExecutionTools` -> `createOpenAiExecutionTools`
-   `remoteUrl` is `string_base_url`

### `0.66.0` _(2024-08-19)_

[🎰] Model updates and registers

-   Prefix all non-pure by `$`
-   Add model `claude-3-5-sonnet-20240620` to `AnthropicClaudeExecutionTools`
-   [🐞] Fix usage counting in `AnthropicClaudeExecutionTools`
-   Update `@anthropic-ai/sdk` from `0.21.1` to `0.26.1`
-   Update `@azure/openai` from `1.0.0-beta.12` to `2.0.0-beta.1`
-   Update `openai` from `4.46.1` to `4.55.9`
-   Add `LlmExecutionToolsConstructor`
-   Add `$llmToolsConfigurationBoilerplatesRegister`
-   Add `$llmToolsRegister`
-   Rename `Openai` ->`OpenAi`

### `0.67.0` _(2024-08-21)_

[🚉] Types and interfaces, JSON serialization

-   Enhance 🤍 The Promptbook Whitepaper
-   Enhance the `README.md`
-   `ExecutionReportJson` is fully serializable as JSON
-   [🛫] `Prompt` is fully serializable as JSON
-   Add type `string_postprocessing_function_name`
-   Add `isSerializableAsJson` utility function, use it to protect inputs and check outputs and export from `@promptbook/utils`
-   Add `serializeError` and `deserializeError` utility functions and export from `@promptbook/utils`
-   Rename `ReferenceError` to `PipelineUrlError`
-   Make index of all errors and export from `@promptbook/core`
-   Mark all entities that are fully serializable as JSON by `[🚉]`
-   When running in browser, auto add `dangerouslyAllowBrowser` from `createOpenAiExecutionTools`
-   `RemoteLlmExecutionTools` automatically retries on error
-   Rename `client_id` -> `string_user_id` and `clientId` -> `userId`

### `0.68.0` _(2024-09-08)_

[🍧] Commands and command parser

-   There are 2 different commands, `EXPECT` and `FORMAT`
-   Rename `BLOCK` command -> `TEMPLATE`
-   `EXPECT JSON` changed to `FORMAT JSON`
-   Change `usagePlaces` -> `isUsedInPipelineHead` + `isUsedInPipelineTemplate`
-   All parsers have functions `$applyToPipelineJson`, `$applyToTemplateJson`, `stringify`, `takeFromPipelineJson` and `takeFromTemplateJson`
-   `PipelineJson` has `defaultModelRequirements`
-   `PipelineJson` has Chat model variant as default without need to specify it explicitly
-   [🥜] Rename "Prompt template" -> "Template"
-   Rename `PromptTemplateJson` -> `TemplateJson`
-   Rename `extractParameterNamesFromPromptTemplate` -> `extractParameterNamesFromTemplate`
-   Rename `PromptTemplateJsonCommon` -> `TemplateJsonCommon`
-   Rename `PromptTemplateParameterJson` -> `ParameterJson`
-   Rename `PipelineJson.promptTemplates` -> `PipelineJson.templates`
-   Rename `PromptDialogJson` -> `DialogTemplateJson`
-   Rename `PROMPT_DIALOG` -> `DIALOG_TEMPLATE`
-   Rename `ScriptJson` -> `ScriptTemplateJson`
-   Rename `SCRIPT` -> `SCRIPT_TEMPLATE`
-   Rename `LlmTemplateJson` -> `PromptTemplateJson`
-   Rename `ParsingError` -> `ParseError`

### `0.69.0` _(2024-09-)_

Command `FOREACH`

-   Allow iterations with `FOREACH` command
-   Paremeter names are case insensitive and normalized
-   Big refactoring of `createPipelineExecutor`
-   Enhance and implement formats `FormatDefinition`
-   Allow to parse CSVs via `CsvFormatDefinition`
-   Change `ListFormatDefinition` -> `TextFormatDefinition`

### `0.70.0` _()_

Support for local models - integrate [Ollama](https://ollama.com/)

-   Make new package `@promptbook/ollama`
-   Add `OllamaExecutionTools` exported from `@promptbook/ollama`

### `0.71.0` _(2024-11-07)_

Knowledge scrapers [🐝]

-   Make new package [`@promptbook/pdf`](https://www.npmjs.com/package/@promptbook/pdf)
-   Make new package [`@promptbook/documents`](https://www.npmjs.com/package/@promptbook/documents)
-   Make new package [`@promptbook/legacy-documents`](https://www.npmjs.com/package/@promptbook/legacy-documents)
-   Make new package [`@promptbook/website-crawler`](https://www.npmjs.com/package/@promptbook/website-crawler)
-   Remove llm tools from `PrepareAndScrapeOptions` and add second arcument to misc preparation functions
-   Allow to import markdown files with knowledge
-   Allow to import `.docx` files with knowledge `.docx` -(Pandoc)-> `.md`
-   Allow to import `.doc` files with knowledge `.doc` -(LibreOffice)-> `.docx` -(Pandoc)-> `.md`
-   Allow to import `.rtf` files with knowledge `.rtf` -(LibreOffice)-> `.docx` -(Pandoc)-> `.md`
-   Allow to import websites with knowledge
-   Add new error `KnowledgeScrapeError`
-   Filesystem is passed as dependency
-   External programs are passed as dependency
-   Remove `PipelineStringToJsonOptions` in favour of `PrepareAndScrapeOptions`
-   Add `MissingToolsError`
-   Change `FileStorage` -> `FileCacheStorage`
-   Changed behavior of `titleToName` when passing URLs or file paths
-   Fix normalize functions when normalizing string containing slash char "/", "\"
-   Pass `fs` through `ExecutionTools`
-   Pass `executables` through `ExecutionTools`
-   Pass `scrapers` through `ExecutionTools`
-   Add utilities `$provideExecutionToolsForBrowser` and `$provideExecutionToolsForNode` and use them in samples
-   Add utilities `$provideScrapersForBrowser` and `$provideScrapersForNode`
-   Rename `createLlmToolsFromConfigurationFromEnv` -> `$provideLlmToolsConfigurationFromEnv` and `createLlmToolsFromEnv` -> `$provideLlmToolsFromEnv`
-   Rename `getLlmToolsForTestingAndScriptsAndPlayground` -> `$provideLlmToolsForTestingAndScriptsAndPlayground`
-   Rename `getLlmToolsForCli` -> `$provideLlmToolsForCli`
-   Change most `Array` -> `ReadonlyArray`
-   Unite `CreatePipelineExecutorOptions` and `CreatePipelineExecutorSettings`
-   Change `--reload-cache` to `--reload` in CLI
-   Prefix default values with `DEFAULT_`

### `0.72.0` _(2024-11-07)_

Support for [Assistants API (GPTs)](https://platform.openai.com/docs/assistants/overview) from OpenAI

-   Add `OpenAiAssistantExecutionTools`
-   `OpenAiExecutionTools.createAssistantSubtools`
-   Add `UNCERTAIN_USAGE`
-   LLM Tools `getClient` method are public
-   LLM Tools `options` are not `private` anymore but `protected`
-   `getClient` methods are public
-   In remote server allow to pass not only `userId` but also `appId` and `customOptions`
-   In remote server `userId` can not be `undefined` anymore but `null`
-   `OpenAiExecutionTools` recieves `userId` (not `user`)
-   Change Collection mode -> Application mode

### `0.73.0` _(2024-11-08)_

-   Split [Promptbook framework](https://github.com/webgptorg/promptbook) and [Book language](https://github.com/webgptorg/book)
-   Rename "sample" -> "example"

### `0.74.0` _(2024-11-11)_

-   Proposal for version `1.0.0` both in Promptbook and Book language
-   Allow to run books directly in cli via `ptbk run ./path/to/book.ptbk.md`
-   Fix security warnings in dependencies
-   Enhance `countLines` and `countPages` utility function
-   No need to explicitly define the input and output parameters
-   Allow empty pipelines
-   Add `BlackholeStorage`
-   Rename `.ptbk.*` -> `.book.*`
-   Split `PROMPTBOOK_VERSION` -> `BOOK_LANGUAGE_VERSION` + `PROMPTBOOK_ENGINE_VERSION`
-   Finish split between [Promptbook framework](https://github.com/webgptorg/promptbook) and [Book language](https://github.com/webgptorg/book)

### `0.75.0` _(2024-11-)_

Formfactors, Rebranding

-   Add `FormfactorCommand`
-   Add Pipeline interfaces
-   Split `ParameterJson` into `InputParameterJson`, `OutputParameterJson` and `IntermediateParameterJson`
-   Reorganize `/src` folder
-   Rename `Template` -> `Task`
-   Rename `TemplateCommand` -> `SectionCommand` command
-   Make alongside `SectionType` the `TaskType`
-   🤍 Change Whitepaper to Abstract
-   Rename default folder for your books from `promptbook-collection` -> `books`
-   Change claim of the project to _"It's time for a paradigm shift! The future of software is in plain English, French or Latin."_

### `0.76.0` _(2024-12-07)_

Skipped, because of the mistake in the versioning. _(It should be pre-release)_

### `0.77.0` _(2024-12-10)_

Support for more models, add `@promptbook/vercel` and `@promptbook/google` packages.

-   **[@promptbook/vercel](https://www.npmjs.com/package/@promptbook/vercel)** - Adapter for Vercel functionalities
-   **[@promptbook/google](https://www.npmjs.com/package/@promptbook/google)** - Integration with Google's Gemini API
-   Option `userId` can be passed into all tools and instead of `null`, it can be `undefined`
-   Rename `$currentDate` -> `$getCurrentDate`

### `0.78.0` _(2024-12-14)_

Utility functions

-   Add `removePipelineCommand`
-   Rename util `renameParameter` -> `renamePipelineParameter`
-   Rename util `extractVariables` -> `extractVariablesFromScript`
-   [👖] Utilities `extractParameterNamesFromTask` and `renamePipelineParameter` are not exported from `@promptbook/utils` but `@promptbook/core` because they are tightly interconnected with the Promptbook and cannot be used as universal utility

### `0.79.0` _(2024-12-27)_

Implicit formfactors

-   You don't need to specify the formfactor or input+output params explicitly. Implementing the formfactor interface is sufficient.
-   Fix in deep cloning of arrays

### `0.80.0` _(2025-01-01)_

Simple chat notation

-   High-level chat notation
-   High-level abstractions
-   Introduction of `compilePipeline`
-   Add utility `orderJson` exported from `@promptbook/utils`
-   Add utility `exportJson` exported from `@promptbook/utils` _(in previous versions this util was private and known as `$asDeeplyFrozenSerializableJson`)_
-   Circular objects with same family references are considered NOT serializable
-   Interactive mode for `FORMFACTOR CHATBOT` in CLI
-   Deprecate `pipelineJsonToString`
-   Deprecate `unpreparePipeline`
-   Rename `pipelineStringToJson` -> `compilePipeline`
-   Rename `pipelineStringToJsonSync` -> `precompilePipeline`

### `0.81.0` _(2025-01-12)_

Editing, templates and flat pipelines

-   Backup original book as `sources` in `PipelineJson`
-   `fetch` is passed through `ExecutionTools` to allow proxying in browser
-   Make new package [`@promptbook/editable`](https://www.npmjs.com/package/@promptbook/editable) and move misc editing tools there
-   Make new package [`@promptbook/templates`](https://www.npmjs.com/package/@promptbook/templates) and add function `getBookTemplate`
-   Rename `replaceParameters` -> `templateParameters`
-   Add `valueToString` and `numberToString` utility function
-   Allow `boolean`, `number`, `null`, `undefined` and full `json` parameters in `templateParameters` _(alongside with `string`)_
-   Change `--output` to `--output` in CLI `ptbk make`
-   Re-introduction of package `@promptbook/wizzard`
-   Allow flat pipelines
-   Root URL for flat pipelines
-   Change `$provideLlmToolsForCli` -> `$provideLlmToolsForWizzardOrCli`
-   Do not require `.book.md` in pipeline url
-   More file paths are considered as valid
-   Walk to the root of the project and find the nearest `.env` file
-   `$provideLlmToolsConfigurationFromEnv`, `$provideLlmToolsFromEnv`, `$provideLlmToolsForWizzardOrCli`, `$provideLlmToolsForTestingAndScriptsAndPlayground` are async
-   `GENERATOR` and `IMAGE_GENERATOR` formfactors
-   Rename `removeContentComments` -> `removeMarkdownComments`
-   Rename `DEFAULT_TITLE` -> `DEFAULT_BOOK_TITLE`
-   Rename `precompilePipeline` -> `parsePipeline`

### `0.82.0` _(2025-01-16)_

Compile via remote server

-   Add `compilePipelineOnRemoteServer` to package `@promptbook/remote-client`
-   Add `preparePipelineOnRemoteServer` to package `@promptbook/remote-client`
-   Changes in remote server that are not backward compatible
-   Add `DEFAULT_TASK_TITLE`
-   Enforce LF (\n) lines

### `0.83.0` and `0.84.0` _(2025-02-04)_

`@promptbook/editable` and integration of `markitdown`

-   Integrate `markitdown` and export through `@promptbook/markitdown`
-   Export parsing internals to `@promptbook/editable`
-   Rename `sourceContent` -> `knowledgeSourceContent`
-   Multiple functions to manipulate with `PipelineString`
-   `book` notation supports values interpolation
-   Make equivalent of `book` notation the `prompt` exported through `@promptbook/utils`
-   Flat books does not expect return parameter
-   Wizzard always returns simple `result: string` key in output
-   Using `BUSL-1.1` license (only for `@promptbook/utils` keep using `CC-BY-4.0`)
-   Support of [DeepSeek models](https://www.deepseek.com/)
-   Support of [`o3-mini` model by OpenAI](https://openai.com/index/openai-o3-mini/)
-   Change admin email to `pavol@ptbk.io`

## In pre-release

### `0.85.0` _(2025-02-17)_

[🐚] Server queue and tasks

-   Publishing Promptbook into [Docker Hub](https://hub.docker.com/r/hejny/promptbook/)
-   Remote server run in both `REST` and `Socket.io` mode
-   Remote server can run entire books not just single prompt tasks _(for now just in REST mode)_
-   _In future_ remote server will support callbacks / pingbacks
-   Remote server has internal task queue
-   Remote server can be started via `ptbk start-server`
-   Hide `$randomSeed`
-   Remove `TaskProgress`
-   Remove `assertsExecutionSuccessful`
-   `PipelineExecutor`: Change `onProgress` -> `ExecutionTask`
-   Remote server allows to set `rootPath`
-   Remote server can run in `Docker`
-   _In future_ remote server persists its queue in `SQLite` / `.promptbook` / `Neo4j`
-   Do not generate stats for pre-releases to speed up the build process
-   Allow pipeline URLs on private and unsecured networks

### `0.85.0` _(2025-02-18)_

Use `.book` as default extension for books

-   Rename `.book.md` -> `.book.md`
-   Rename `.book.json` -> `.bookc`
-   Establish `.bookc` format - compiled book json in zip archive
-   Use [VCCode extension `Promptbook .book language support`](https://marketplace.visualstudio.com/items?itemName=promptbook.book-extension)
-   Fix: Version published to Docker Hub does not lag behind the NPM version

## Drafts

### `0..0` _(2024--)_

`createLibraryFromDirectory` uses prebuild library

### `0..0` _(2024--)_

Better expectation format in `PromptbookJson`

### `0..0` _(2024--)_

Allow to split parameters into multiple values and iterate over them

### `0..0` _(2024--)_

<!-- Search ACRY "MODEL NAME " -->

-   Allow to specify model creativity eg. `MODEL CREATIVITY EXTREME`

### `0..0` _(2024--)_

Better script execution

-   Gettings rid of `JavascriptEvalExecutionTools` and implement propper isolated script execution in `JavascriptExecutionTools`
-   List all default postprocessing functions in `@promptbook/utils` README
-   Implement `PythonExecutionTools` for executing Python scripts

### `0..0` _(2024--)_

<!--[🍓]-->

More options to create `PromptbookLibrary`

### `0..0` _(2024--)_

Intagration with Langtail

### `0..0` _(2024--)_

<!--[🍓]-->

-   TODO: Add splitInto functions to `@promptbook/utils` besides all the `count` functions

-   Add `countCharacters` -> `splitIntoCharacters`
-   Add `countLines` -> `splitIntoLines`
-   Add `countPages` -> `splitIntoPages`
-   Add `countParagraphs` -> `splitIntoParagraphs`
-   Add `countSentences` -> `splitIntoSentences`
-   Add `CountUtils` -> `splitIntoUtils`
-   Add `countWords` -> `splitIntoWords`

### `0..0` _(2024-0-)_

More expect variations

<!--[🍓]-->

-   Add command `EXPECT "..."` <- [🥤]
-   Add command `EXPECT /.../i` <- [🥤]
-   Add command `EXPECT "...{foo}..."` <- [🥤]
-   Add command `EXPECT /...{foo}.../i` <- [🥤]
-   Add command `EXPECT JSON ARRAY` and `EXPECT JSON OBJECT` _(In future this will be suggar code for `EXPECT JSON SCHEMA`)_ <- [🥤]

## Upcomming features

-   When postprocessing fails, retry in same way as failed expectations
-   When making next attempt for `DIALOG BLOCK`, preserve the previous user input <- [🌹]

## `1.0.0` Release

Across the repository there are marked [🍓] places that are required to be done before `1.0.0` release

<!-- Note: All places marked by [➕] to add new NPM package -->
<!-- Note: All places marked by [🤖] to add new model variant -->
<!-- Note: All places marked by [🅱] to add new task type -->
