// @promptbook/core

import { collectionToJson } from '../collection/collectionToJson';
import { createCollectionFromJson } from '../collection/constructors/createCollectionFromJson';
import { createCollectionFromPromise } from '../collection/constructors/createCollectionFromPromise';
import { createCollectionFromUrl } from '../collection/constructors/createCollectionFromUrl';
import { createSubcollection } from '../collection/constructors/createSubcollection';
import { BlockTypes } from '../commands/BLOCK/BlockTypes';
import { RESERVED_PARAMETER_NAMES } from '../config';
import { pipelineJsonToString } from '../conversion/pipelineJsonToString';
import { pipelineStringToJson } from '../conversion/pipelineStringToJson';
import { pipelineStringToJsonSync } from '../conversion/pipelineStringToJsonSync';
import { prettifyPipelineString } from '../conversion/prettify/prettifyPipelineString';
import { stringifyPipelineJson } from '../conversion/utils/stringifyPipelineJson';
import { validatePipeline } from '../conversion/validation/validatePipeline';
import { CollectionError } from '../errors/CollectionError';
import { NotFoundError } from '../errors/NotFoundError';
import { ParsingError } from '../errors/ParsingError';
import { PipelineExecutionError } from '../errors/PipelineExecutionError';
import { PipelineLogicError } from '../errors/PipelineLogicError';
import { ReferenceError } from '../errors/ReferenceError';
import { UnexpectedError } from '../errors/UnexpectedError';
import { VersionMismatchError } from '../errors/VersionMismatchError';
import { ExpectError } from '../errors/_ExpectError';
import { assertsExecutionSuccessful } from '../execution/assertsExecutionSuccessful';
import { createPipelineExecutor } from '../execution/createPipelineExecutor';
import { embeddingVectorToString } from '../execution/embeddingVectorToString';
import { addUsage } from '../execution/utils/addUsage';
import { checkExpectations, isPassingExpectations } from '../execution/utils/checkExpectations';
import { usageToHuman } from '../execution/utils/usageToHuman';
import { usageToWorktime } from '../execution/utils/usageToWorktime';
import { CallbackInterfaceTools } from '../knowledge/dialogs/callback/CallbackInterfaceTools';
import type { CallbackInterfaceToolsOptions } from '../knowledge/dialogs/callback/CallbackInterfaceToolsOptions';
import { SimplePromptInterfaceTools } from '../knowledge/dialogs/simple-prompt/SimplePromptInterfaceTools';
import { prepareKnowledgeFromMarkdown } from '../knowledge/prepare-knowledge/markdown/prepareKnowledgeFromMarkdown';
import { joinLlmExecutionTools } from '../llm-providers/multiple/joinLlmExecutionTools';
import { preparePipeline } from '../prepare/preparePipeline';
import { unpreparePipeline } from '../prepare/unpreparePipeline';
import type { ExecutionReportStringOptions } from '../types/execution-report/ExecutionReportStringOptions';
import { ExecutionReportStringOptionsDefaults } from '../types/execution-report/ExecutionReportStringOptions';
import { executionReportJsonToString } from '../types/execution-report/executionReportJsonToString';

// Note: Exporting version from each package

// @promptbook/core
export { BlockTypes, RESERVED_PARAMETER_NAMES };

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
    usageToHuman,
    usageToWorktime,
};

// @promptbook/library
export {
    collectionToJson,
    createCollectionFromJson,
    createCollectionFromPromise,
    createCollectionFromUrl,
    createSubcollection,
};

// @promptbook/simple-prompt
export { SimplePromptInterfaceTools };

// @promptbook/parser
export {
    pipelineJsonToString,
    pipelineStringToJson,
    pipelineStringToJsonSync,
    stringifyPipelineJson,
    validatePipeline,
};

// @promptbook/preparation
export { preparePipeline, unpreparePipeline };

// @promptbook/executor
export { createPipelineExecutor, joinLlmExecutionTools };

// @promptbook/callback-prompt
export { CallbackInterfaceTools, CallbackInterfaceToolsOptions };

// Errors
export {
    CollectionError,
    ExpectError,
    NotFoundError,
    ParsingError,
    PipelineExecutionError,
    PipelineLogicError,
    ReferenceError,
    UnexpectedError,
    VersionMismatchError,
};
