# ⌚ Changelog

## 0.20.0 _(2023-12-29)_

-   Change keyword `USE` to `MODEL VARIANT`
-   Allow to specify exact model eg. `MODEL NAME gpt-4-1106-preview`

## 0.20.1 _(2024-01-15)_

-   Add postprocessing function `trimEndOfCodeBlock`

## 0.20.2 _(2024-01-16)_

-   `replaceParameters` works with inlined JSONs

## 0.23.0 _(2024-01-25)_

-   You are able to send markdown code block in prompts _(without traces of escaping)_
-   Postprocessing function `trimEndOfCodeBlock` is not working with escaped code blocks JUST with markdown code blocks
-   Rename `extractBlocksFromMarkdown` to `extractAllBlocksFromMarkdown`

## 0.24.0 _(2024-01-25)_

-   Add postprocessing function `trimCodeBlock`
-   Add `EXPECT` command to promptbooks
-   Add `ExecutionReport`
-   Add `parseNumber` utility function
-   `PtpExecutor` returns richer result and does not throw, just returns `isSuccessful=false`, You can use `assertsExecutionSuccessful` utility function to check if the execution was successful
-   Add `assertsExecutionSuccessful` utility function

## 0.25.0 _(2024-02-03)_

-   `CreatePtpExecutorSettings` are not mandatory anymore

## 0.26.0 _(2024-02-03)_

-   Add `EXPECT JSON` command to promptbooks
-   Split internal representation `EXPECT` into `EXPECT_AMOUNT` and `EXPECT_FORMAT`

## 0.27.0 _(2024-02-03)_

Moving logic from `promptTemplatePipelineStringToJson` to `createPtpExecutor`

-   Allow postprocessing and expectations in all execution types
-   Postprocessing is happening before checking expectations
-   In `PromptTemplatePipelineJson` postprocessing is represented internally in each `PromptTemplateJson` not as separate `PromptTemplateJson`
-   Introduce `ExpectError`
-   Rename `maxNaturalExecutionAttempts` to `maxExecutionAttempts` (because now it is not just for natural execution)
-   If title in promptbook contains emojis, pass it innto report
-   Fix `description` in report
-   Asking user infinite times for input if the input not matches the expectations

## 0.28.0 _(2024-02-05)_

Better execution report in markdown format

-   Add `JOKER {foo}` as a way how to skip part of the promptbook
-   Split `UserInterfaceToolsPromptDialogOptions.prompt` into `promptTitle` and `promptMessage`
-   Add `UserInterfaceToolsPromptDialogOptions.priority`
-   Add timing information to report
-   Maximum must be higher than minimum in `EXPECT` statement
-   Maximum 0 is not valid, should be at least 1 in `EXPECT` statement

## 0.29.0 _(2024-02-06)_

-   Allow to use custom postprocessing functions
-   Allow async postprocessing functions

## 0.30.0 _(2024-02-09)_

-   Remove `PromptTemplatePipeline` _(just using JSON `PromptTemplatePipelineJson` format)_
    -   `CreatePtpExecutorOptions` has `PromptTemplatePipelineJson`
-   Promptbooks are executed in parallel
    -   `PromptTemplateJson` contains `dependentParameterNames`
    -   `validatePromptTemplatePipelineJson` is checking for circular dependencies
    -   Test that joker is one of the dependent parameters

## 0.31.0 _(2024-02-12)_

Better execution reports

-   Filter out voids in `executionReportJsonToString`
-   Add timing information to `ExecutionReportJson` _(In both text and chart format)_
-   Add money cost information to `ExecutionReportJson` _(In both text and chart format)_
-   Escape code blocks in markdown
-   Do not export `replaceParameters` utility function

## 0.32.0 _(2024-02-12)_

Export less functions from `@promptbook/utils`

## ~~0.33.0~~ _(Skipped)_

~~Iterating over parameters~~

-   ~~Parameters can be both `string` and `Array<string>`~~
    -   ~~`Array<string>` will itterate over all values~~
    -   ~~You can use postprocessing functions or `EXECUTE SCRIPT` to split string into array and vice versa~~

## 0.34.0 _(2024-02-19)_

-   Do not remove emojis or formatting from task title in progress

## 0.35.0 _(2024-02-XX)_

Extending promptbooks

<!-- TODO: !!!! Describe in detail -->

## Upcomming

-   Rename "natural" -> "llm"
-   Add command `EXPECT JSON ARRAY` and `EXPECT JSON OBJECT` _(In future this will be suggar code for `EXPECT JSON SCHEMA`)_ <-[🥤]
-   When making next attempt for `PROMPT DIALOG`, preserve the previous user input <-[🌹]
