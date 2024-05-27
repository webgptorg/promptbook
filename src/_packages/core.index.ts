import { prettifyPromptbookString } from '../conversion/prettify/prettifyPromptbookString';
import { promptbookJsonToString } from '../conversion/promptbookJsonToString';
import { promptbookStringToJson } from '../conversion/promptbookStringToJson';
import { validatePromptbookJson } from '../conversion/validation/validatePromptbookJson';
import { assertsExecutionSuccessful } from '../execution/assertsExecutionSuccessful';
import { createPromptbookExecutor } from '../execution/createPromptbookExecutor';
import { MultipleLlmExecutionTools } from '../execution/plugins/llm-execution-tools/multiple/MultipleLlmExecutionTools';
import { CallbackInterfaceTools } from '../execution/plugins/user-interface-execution-tools/callback/CallbackInterfaceTools';
import { CallbackInterfaceToolsOptions } from '../execution/plugins/user-interface-execution-tools/callback/CallbackInterfaceToolsOptions';
import { SimplePromptInterfaceTools } from '../execution/plugins/user-interface-execution-tools/simple-prompt/SimplePromptInterfaceTools';
import { checkExpectations, isPassingExpectations } from '../execution/utils/checkExpectations';
import { createPromptbookLibraryFromPromise } from '../library/constructors/createPromptbookLibraryFromPromise';
import { createPromptbookLibraryFromSources } from '../library/constructors/createPromptbookLibraryFromSources';
import { createPromptbookSublibrary } from '../library/constructors/createPromptbookSublibrary';
import { SimplePromptbookLibrary } from '../library/SimplePromptbookLibrary';
import { executionReportJsonToString } from '../types/execution-report/executionReportJsonToString';
import {
    ExecutionReportStringOptions,
    ExecutionReportStringOptionsDefaults,
} from '../types/execution-report/ExecutionReportStringOptions';
import { ExecutionTypes } from '../types/ExecutionTypes';
import { PROMPTBOOK_VERSION } from '../version';

// @promptbook/core
export { ExecutionTypes, PROMPTBOOK_VERSION };

// Core utilities
export {
    assertsExecutionSuccessful,
    checkExpectations,
    executionReportJsonToString,
    ExecutionReportStringOptions,
    ExecutionReportStringOptionsDefaults,
    isPassingExpectations,
    prettifyPromptbookString,
};

// @promptbook/library
export {
    // TODO: !!! [🍓] createPromptbookLibraryFromDirectory,
    // TODO:  !!! [🍓] createPromptbookLibraryFromUrl,
    createPromptbookLibraryFromPromise,
    createPromptbookLibraryFromSources,
    createPromptbookSublibrary,
    SimplePromptbookLibrary,
};

// @promptbook/simple-prompt
export { SimplePromptInterfaceTools };

// @promptbook/parser
export { promptbookJsonToString, promptbookStringToJson, validatePromptbookJson };

// @promptbook/executor
export { createPromptbookExecutor, MultipleLlmExecutionTools };

// @promptbook/callback-prompt
export { CallbackInterfaceTools, CallbackInterfaceToolsOptions };
