// @promptbook/core

import { pipelineJsonToString } from '../conversion/pipelineJsonToString';
import { pipelineStringToJson } from '../conversion/pipelineStringToJson';
import { pipelineStringToJsonSync } from '../conversion/pipelineStringToJsonSync';
import { prettifyPipelineString } from '../conversion/prettify/prettifyPipelineString';
import { validatePromptbook } from '../conversion/validation/validatePromptbook';
import { PromptbookExecutionError } from '../errors/PromptbookExecutionError';
import { PromptbookLibraryError } from '../errors/PromptbookLibraryError';
import { PromptbookLogicError } from '../errors/PromptbookLogicError';
import { PromptbookNotFoundError } from '../errors/PromptbookNotFoundError';
import { PromptbookReferenceError } from '../errors/PromptbookReferenceError';
import { PromptbookSyntaxError } from '../errors/PromptbookSyntaxError';
import { TemplateError } from '../errors/TemplateError';
import { UnexpectedError } from '../errors/UnexpectedError';
import { ExpectError } from '../errors/_ExpectError';
import { assertsExecutionSuccessful } from '../execution/assertsExecutionSuccessful';
import { createPromptbookExecutor } from '../execution/createPromptbookExecutor';
import { embeddingVectorToString } from '../execution/embeddingVectorToString';
import { addUsage } from '../execution/utils/addUsage';
import { checkExpectations, isPassingExpectations } from '../execution/utils/checkExpectations';
import { usageToWorktime } from '../execution/utils/usageToWorktime';
import { CallbackInterfaceTools } from '../knowledge/dialogs/callback/CallbackInterfaceTools';
import type { CallbackInterfaceToolsOptions } from '../knowledge/dialogs/callback/CallbackInterfaceToolsOptions';
import { SimplePromptInterfaceTools } from '../knowledge/dialogs/simple-prompt/SimplePromptInterfaceTools';
import { prepareKnowledgeFromMarkdown } from '../knowledge/prepare-knowledge/markdown/prepareKnowledgeFromMarkdown';
import { createLibraryFromJson } from '../library/constructors/createLibraryFromJson';
import { createLibraryFromPromise } from '../library/constructors/createLibraryFromPromise';
import { createLibraryFromUrl } from '../library/constructors/createLibraryFromUrl';
import { createSublibrary } from '../library/constructors/createSublibrary';
import { libraryToJson } from '../library/libraryToJson';
import { MultipleLlmExecutionTools } from '../llm-providers/multiple/MultipleLlmExecutionTools';
import { ExecutionTypes } from '../types/ExecutionTypes';
import type { ExecutionReportStringOptions } from '../types/execution-report/ExecutionReportStringOptions';
import { ExecutionReportStringOptionsDefaults } from '../types/execution-report/ExecutionReportStringOptions';
import { executionReportJsonToString } from '../types/execution-report/executionReportJsonToString';
import { PROMPTBOOK_VERSION } from '../version';

// Note: Exporting version from each package
export { PROMPTBOOK_VERSION };

// @promptbook/core
export { ExecutionTypes };

// Core utilities
export {
    ExecutionReportStringOptions,
    ExecutionReportStringOptionsDefaults,
    addUsage,
    assertsExecutionSuccessful,
    checkExpectations,
    embeddingVectorToString,
    executionReportJsonToString,
    isPassingExpectations,
    prepareKnowledgeFromMarkdown,
    prettifyPipelineString,
    usageToWorktime,
};

// @promptbook/library
export { createLibraryFromJson, createLibraryFromPromise, createLibraryFromUrl, createSublibrary, libraryToJson };

// @promptbook/simple-prompt
export { SimplePromptInterfaceTools };

// @promptbook/parser
export { pipelineJsonToString, pipelineStringToJson, pipelineStringToJsonSync, validatePromptbook };

// @promptbook/executor
export { MultipleLlmExecutionTools, createPromptbookExecutor };

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
