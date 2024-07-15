// @promptbook/core

import { collectionToJson } from '../collection/collectionToJson';
import { createCollectionFromJson } from '../collection/constructors/createCollectionFromJson';
import { createCollectionFromPromise } from '../collection/constructors/createCollectionFromPromise';
import { createCollectionFromUrl } from '../collection/constructors/createCollectionFromUrl';
import { createSubcollection } from '../collection/constructors/createSubcollection';
import { pipelineJsonToString } from '../conversion/pipelineJsonToString';
import { pipelineStringToJson } from '../conversion/pipelineStringToJson';
import { pipelineStringToJsonSync } from '../conversion/pipelineStringToJsonSync';
import { prettifyPipelineString } from '../conversion/prettify/prettifyPipelineString';
import { validatePipeline } from '../conversion/validation/validatePipeline';
import { CollectionError } from '../errors/CollectionError';
import { ExecutionError } from '../errors/ExecutionError';
import { NotFoundError } from '../errors/NotFoundError';
import { PipelineLogicError } from '../errors/PipelineLogicError';
import { ReferenceError } from '../errors/ReferenceError';
import { SyntaxError } from '../errors/SyntaxError';
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
    addUsage,
    assertsExecutionSuccessful,
    checkExpectations,
    embeddingVectorToString,
    executionReportJsonToString,
    ExecutionReportStringOptions,
    ExecutionReportStringOptionsDefaults,
    isPassingExpectations,
    prepareKnowledgeFromMarkdown,
    prettifyPipelineString,
    usageToWorktime,
};

// @promptbook/library
export {
    collectionToJson,
    createCollectionFromJson,
    createCollectionFromPromise,
    createCollectionFromUrl,
    createSubcollection as createSublibrary,
};

// @promptbook/simple-prompt
export { SimplePromptInterfaceTools };

// @promptbook/parser
export { pipelineJsonToString, pipelineStringToJson, pipelineStringToJsonSync, validatePipeline };

// @promptbook/executor
export { createPromptbookExecutor, MultipleLlmExecutionTools };

// @promptbook/callback-prompt
export { CallbackInterfaceTools, CallbackInterfaceToolsOptions };

// Errors
export {
    CollectionError,
    ExecutionError,
    ExpectError,
    NotFoundError,
    PipelineLogicError,
    ReferenceError,
    SyntaxError,
    TemplateError,
    UnexpectedError,
};
