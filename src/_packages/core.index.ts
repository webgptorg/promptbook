// @promptbook/core

import { prettifyPromptbookString } from '../conversion/prettify/prettifyPromptbookString';
import { promptbookJsonToString } from '../conversion/promptbookJsonToString';
import { promptbookStringToJson } from '../conversion/promptbookStringToJson';
import { validatePromptbookJson } from '../conversion/validation/validatePromptbookJson';
import { ExpectError } from '../errors/_ExpectError';
import { PromptbookExecutionError } from '../errors/PromptbookExecutionError';
import { PromptbookLibraryError } from '../errors/PromptbookLibraryError';
import { PromptbookLogicError } from '../errors/PromptbookLogicError';
import { PromptbookNotFoundError } from '../errors/PromptbookNotFoundError';
import { PromptbookReferenceError } from '../errors/PromptbookReferenceError';
import { PromptbookSyntaxError } from '../errors/PromptbookSyntaxError';
import { TemplateError } from '../errors/TemplateError';
import { UnexpectedError } from '../errors/UnexpectedError';
import { assertsExecutionSuccessful } from '../execution/assertsExecutionSuccessful';
import { createPromptbookExecutor } from '../execution/createPromptbookExecutor';
import { addUsage } from '../execution/utils/addUsage';
import { checkExpectations, isPassingExpectations } from '../execution/utils/checkExpectations';
import { usageToWorktime } from '../execution/utils/usageToWorktime';
import { CallbackInterfaceTools } from '../knowledge/dialogs/callback/CallbackInterfaceTools';
import type { CallbackInterfaceToolsOptions } from '../knowledge/dialogs/callback/CallbackInterfaceToolsOptions';
import { SimplePromptInterfaceTools } from '../knowledge/dialogs/simple-prompt/SimplePromptInterfaceTools';
import { prepareKnowledgeFromMarkdown } from '../knowledge/prepare-knowledge/markdown/prepareKnowledgeFromMarkdown';
import { createPromptbookLibraryFromPromise } from '../library/constructors/createPromptbookLibraryFromPromise';
import { createPromptbookLibraryFromSources } from '../library/constructors/createPromptbookLibraryFromSources';
import { createPromptbookLibraryFromUrl } from '../library/constructors/createPromptbookLibraryFromUrl';
import { createPromptbookSublibrary } from '../library/constructors/createPromptbookSublibrary';
import { SimplePromptbookLibrary } from '../library/SimplePromptbookLibrary';
import { MultipleLlmExecutionTools } from '../llm-providers/multiple/MultipleLlmExecutionTools';
import { executionReportJsonToString } from '../types/execution-report/executionReportJsonToString';
import type { ExecutionReportStringOptions } from '../types/execution-report/ExecutionReportStringOptions';
import { ExecutionReportStringOptionsDefaults } from '../types/execution-report/ExecutionReportStringOptions';
import { ExecutionTypes } from '../types/ExecutionTypes';
import { PROMPTBOOK_VERSION } from '../version';

// Note: Exporting version from each package
export { PROMPTBOOK_VERSION };

// @promptbook/core
export { ExecutionTypes };

// Core utilities
export {
    addUsage,
    assertsExecutionSuccessful,
    checkExpectations,
    executionReportJsonToString,
    ExecutionReportStringOptions,
    ExecutionReportStringOptionsDefaults,
    isPassingExpectations,
    prepareKnowledgeFromMarkdown,
    prettifyPromptbookString,
    usageToWorktime,
};

// @promptbook/library
export {
    createPromptbookLibraryFromPromise,
    createPromptbookLibraryFromSources,
    createPromptbookLibraryFromUrl,
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

// Errors
export {
    ExpectError,
    PromptbookExecutionError,
    PromptbookLibraryError,
    PromptbookLogicError,
    PromptbookNotFoundError,
    PromptbookReferenceError,
    PromptbookSyntaxError,
    TemplateError,
    UnexpectedError,
};
