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

## ~~0.33.0~~ _(Skipped)_

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
npx ptbk prettify promptbook/**/*.ptbk.md
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
-   Export `PROMPTBOOK_VERSION` from each package
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

## In pre-release

### `0.61.0` _(2024-07-!!!)_

Big syntax additions
Working external knowledge, personas, preparation for instruments and actions

-   Rename `SynraxError` to `ParsingError`
-   Allow deep structure (h3, h4,...) in `.ptbk.md` files
-   Add `SAMPLE` command with notation for parameter samples to `.ptbk.md` files
-   Add `KNOWLEDGE` command to `.ptbk.md` files
-   Change `EXECUTE` command to `BLOCK` command
-   Change `executionType` -> `blockType`
-   Add `callEmbeddingModel` to `LlmExecutionTools`
-   `callChatModel` and `callCompletionModel` are not required to be implemented in `LlmExecutionTools` anymore
-   Remove `MultipleLlmExecutionTools` and make `joinLlmExecutionTools` function
-   You can pass simple array of `LlmExecutionTools` into `ExecutionTools` and it will be joined automatically via `joinLlmExecutionTools`
-   Remove the `MarkdownStructure` and replace by simpler solution `flattenMarkdown` + `splitMarkdownIntoSections` + `parseMarkdownSection` which works just with markdown strings and export from `@promptbook/utils` <- [🕞]
-   Markdown utils are exported through `@promptbook/markdown-utils` _(and removed from `@promptbook/utils`)_
-   String normalizers goes alongside with types; for example `normalizeTo_SCREAMING_CASE` -> `string_SCREAMING_CASE`
-   Export `isValidUrl`, `isValidPipelineUrl`, `isValidFilePath`, `isValidJavascriptName`, `isValidSemanticVersion`, `isHostnameOnPrivateNetwork`, `isUrlOnPrivateNetwork` and `isValidUuid` from `@promptbook/utils`

## In prepare

### `0..0` _(2024-0-)_

`createLibraryFromDirectory` uses prebuild library

### `0..0` _(2024-0-)_

Better expectation format in `PromptbookJson`

### `0..0` _(2024-0-)_

Allow to split parameters into multiple values and iterate over them

### `0..0` _(2024-0-)_

<!-- Search ACRY "MODEL NAME " -->

-   Allow to specify model creativity eg. `MODEL CREATIVITY EXTREME`

### `0..0` _(2024-0-)_

Better script execution

-   Gettings rid of `JavascriptEvalExecutionTools` and implement propper isolated script execution in `JavascriptExecutionTools`
-   List all default postprocessing functions in `@promptbook/utils` README
-   Implement `PythonExecutionTools` for executing Python scripts

### `0..0` _(2024-0-)_

<!--[🍓]-->

More options to create `PromptbookLibrary`

### `0..0` _(2024-0-)_

Intagration with Langtail

### `0..0` _(2024-0-)_

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

-   Add command `EXPECT "..."` <-[🥤]
-   Add command `EXPECT /.../i` <-[🥤]
-   Add command `EXPECT "...{foo}..."` <-[🥤]
-   Add command `EXPECT /...{foo}.../i` <-[🥤]
-   Add command `EXPECT JSON ARRAY` and `EXPECT JSON OBJECT` _(In future this will be suggar code for `EXPECT JSON SCHEMA`)_ <-[🥤]

## Upcomming features

-   When postprocessing fails, retry in same way as failed expectations
-   When making next attempt for `PROMPT DIALOG`, preserve the previous user input <-[🌹]

## `1.0.0` Release

Across the repository there are marked [🍓] places that are required to be done before `1.0.0` release

<!-- Note: [➕] All places marked by [➕] to add new NPM package -->
<!-- Note: [🤖] All places marked by [🤖] to add new model variant -->
<!-- Note: [🩻] All places marked by [🩻] to add new (execution) block type -->
