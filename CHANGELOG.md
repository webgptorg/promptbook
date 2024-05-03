# ⌚ Changelog

## Released versions

### 0.20.0 _(2023-12-29)_

-   Change keyword `USE` to `MODEL VARIANT`
-   Allow to specify exact model eg. `MODEL NAME gpt-4-1106-preview`

### 0.20.1 _(2024-01-15)_

-   Add postprocessing function `trimEndOfCodeBlock`

### 0.20.2 _(2024-01-16)_

-   `replaceParameters` works with inlined JSONs

### 0.23.0 _(2024-01-25)_

-   You are able to send markdown code block in prompts _(without traces of escaping)_
-   Postprocessing function `trimEndOfCodeBlock` is not working with escaped code blocks JUST with markdown code blocks
-   Rename `extractBlocksFromMarkdown` to `extractAllBlocksFromMarkdown`

### 0.24.0 _(2024-01-25)_

-   Add postprocessing function `trimCodeBlock`
-   Add `EXPECT` command to promptbooks
-   Add `ExecutionReport`
-   Add `parseNumber` utility function
-   `PtbkExecutor` returns richer result and does not throw, just returns `isSuccessful=false`, You can use `assertsExecutionSuccessful` utility function to check if the execution was successful
-   Add `assertsExecutionSuccessful` utility function

### 0.25.0 _(2024-02-03)_

-   `CreatePtbkExecutorSettings` are not mandatory anymore

### 0.26.0 _(2024-02-03)_

-   Add `EXPECT JSON` command to promptbooks
-   Split internal representation `EXPECT` into `EXPECT_AMOUNT` and `EXPECT_FORMAT`

### 0.27.0 _(2024-02-03)_

Moving logic from `promptbookStringToJson` to `createPtbkExecutor`

-   Allow postprocessing and expectations in all execution types
-   Postprocessing is happening before checking expectations
-   In `PromptbookJson` postprocessing is represented internally in each `PromptTemplateJson` not as separate `PromptTemplateJson`
-   Introduce `ExpectError`
-   Rename `maxNaturalExecutionAttempts` to `maxExecutionAttempts` (because now it is not just for natural execution)
-   If title in promptbook contains emojis, pass it innto report
-   Fix `description` in report
-   Asking user infinite times for input if the input not matches the expectations

### 0.28.0 _(2024-02-05)_

Better execution report in markdown format

-   Add `JOKER {foo}` as a way how to skip part of the promptbook
-   Split `UserInterfaceToolsPromptDialogOptions.prompt` into `promptTitle` and `promptMessage`
-   Add `UserInterfaceToolsPromptDialogOptions.priority`
-   Add timing information to report
-   Maximum must be higher than minimum in `EXPECT` statement
-   Maximum 0 is not valid, should be at least 1 in `EXPECT` statement

### 0.29.0 _(2024-02-06)_

-   Allow to use custom postprocessing functions
-   Allow async postprocessing functions

### 0.30.0 _(2024-02-09)_

-   Remove `Promptbook` _(just using JSON `PromptbookJson` format)_
    -   `CreatePtbkExecutorOptions` has `PromptbookJson`
-   Promptbooks are executed in parallel
    -   `PromptTemplateJson` contains `dependentParameterNames`
    -   `validatePromptbookJson` is checking for circular dependencies
    -   Test that joker is one of the dependent parameters

### 0.31.0 _(2024-02-12)_

Better execution reports

-   Filter out voids in `executionReportJsonToString`
-   Add timing information to `ExecutionReportJson` _(In both text and chart format)_
-   Add money cost information to `ExecutionReportJson` _(In both text and chart format)_
-   Escape code blocks in markdown
-   Do not export `replaceParameters` utility function

### 0.32.0 _(2024-02-12)_

Export less functions from `@promptbook/utils`

## ~~0.33.0~~ _(Skipped)_

~~Iterating over parameters~~

-   ~~Parameters can be both `string` and `Array<string>`~~
    -   ~~`Array<string>` will itterate over all values~~
    -   ~~You can use postprocessing functions or `EXECUTE SCRIPT` to split string into array and vice versa~~

### 0.34.0 _(2024-02-19)_

-   Do not remove emojis or formatting from task title in progress

### 0.35.0 _(2024-03-01)_

-   You can use `prettifyMarkdown` for postprocessing

### 0.35.1 _(2024-03-06)_

-   Add Mermaid graph to sample promptbooks
-   Fix spelling errors in OpenAI error messages

### 0.36.0 _(2024-03-06)_

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
-   Change command `PTBK_URL` to `PROMPTBOOK_URL` _(but keep backward compatibility and preserve alias `PTBK`)_
-   Change command `PTBK_NAME` to `PROMPTBOOK_NAME` _(but keep backward compatibility and preserve alias `PTBK`)_
-   Rename `runRemoteServer` -> `startRemoteServer` and return `Destroyable` object

### 0.37.0 _(2024-03-08)_

Explicit output parameters

-   Every promptbook has to have `OUTPUT PARAMETER` property in header

### 0.38.0 _(2024-03-09)_

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

### 0.39.0 _(2024-03-09)_

Working on **Promptbook Library**. Identify promptbooks by URL.

-   Change `PromptbookLibrary` class to interface
-   Add `SimplePromptbookLibrary` class which implements `PromptbookLibrary`
-   Rename `PromptbookLibrary.promptbookNames` to `PromptbookLibrary.promptbookUrls`
-   Remove `PromptbookLibrary.createExecutor` to separate responsibility
-   Make more renamings and reorganizations in `PromptbookLibrary`
-   Make `PromptbookLibrary.listPromptbooks` async method
-   Make `PromptbookLibrary.getPromptbookByUrl` async method

### 0.40.0 _(2024-03-10)_

Multiple factories for `PromptbookLibrary`, Custom errors, enhance templating

<!--[🆔]-->

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

### 0.41.0 _(2024-03-23)_

More options to create `PromptbookLibrary`

-   Utility `createPromptbookLibraryFromDirectory`
-   Utility `createPromptbookLibraryFromList`
-   Add `extractBlock` to build-in functions
-   Remove problematic usage of `chalk` and use `colors` instead
-   Export `replaceParameters` from `@promptbook/utils`

### 0.42.0 _(2024-03-24)_

Better logo and branding of Promptbook.

### 0.43.0 _(2024-03-26)_

CLI utils exported from `@promptbook/cli`

After install you can use `promptbook` command in terminal:

```bash
npm i @promptbook/utils
npx promptbook prettify promptbook/**/*.ptbk.md
```

### 0.44.0 _(2024-04-26)_

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

### 0.45.0 _(2024-04-27)_

More direct usage of OpenAI API, Refactoring

-   Pass directly Open AI otpions to `OpenAiExecutionTools`
    -   Change `openAiApiKey` -> `apiKey` when creating new `OpenAiExecutionTools`
-   Change all import statements to import type when importing just types

### 0.46.0 _(2024-04-28)_

Reorganize packages

> 💡 Now you can just install `promptbook` or `ptbk` as alias for everything

-   New package `promptbook` as a link to all other packages
-   New package `ptbk` as an alias to `promptbook`
-   New package `@promptbook/mock`
    -   Move there `MockedEchoLlmExecutionTools` and `MockedFackedLlmExecutionTools` from `@promptbook/core`
-   New package `@promptbook/langtail` to prepare for [Langtail](https://langtail.com/) integration

### 0.47.0 _(2024-05-02)_

Tools refactoring

-   Rename "natural" -> "llm"
-   Allow to pass multiple `llm` into `ExecutionTools` container
-   Export `renderPromptbookMermaid` through `@promptbook/utils`

## In pre-release

## In prepare

### 0..0 _(2024-0-)_

Better script execution

-   Gettings rid of `JavascriptEvalExecutionTools` and implement propper isolated script execution in `JavascriptExecutionTools`
-   List all default postprocessing functions in `@promptbook/utils` README
-   Implement `PythonExecutionTools` for executing Python scripts

### 0..0 _(2024-0-)_

More options to create `PromptbookLibrary`

### 0..0 _(2024-0-)_

Intagration with Langtail

### 0..0 _(2024-0-)_

-   TODO: !!! Add splitInto functions to `@promptbook/utils` besides all the `count` functions

-   Add `countCharacters` -> `splitIntoCharacters`
-   Add `countLines` -> `splitIntoLines`
-   Add `countPages` -> `splitIntoPages`
-   Add `countParagraphs` -> `splitIntoParagraphs`
-   Add `countSentences` -> `splitIntoSentences`
-   Add `CountUtils` -> `splitIntoUtils`
-   Add `countWords` -> `splitIntoWords`

### 0..0 _(2024-0-)_

More expect variations

-   Add command `EXPECT "..."` <-[🥤]
-   Add command `EXPECT /.../i` <-[🥤]
-   Add command `EXPECT "...{foo}..."` <-[🥤]
-   Add command `EXPECT /...{foo}.../i` <-[🥤]
-   Add command `EXPECT JSON ARRAY` and `EXPECT JSON OBJECT` _(In future this will be suggar code for `EXPECT JSON SCHEMA`)_ <-[🥤]

## Upcomming features

-   When postprocessing fails, retry in same way as failed expectations
-   When making next attempt for `PROMPT DIALOG`, preserve the previous user input <-[🌹]
