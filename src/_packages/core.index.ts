// ⚠️ WARNING: This code has been generated so that any manual changes will be overwritten
// `@promptbook/core`

import { REMOTE_SERVER_URLS } from '../../servers';
import { createAgentModelRequirements } from '../book-2.0/agent-source/createAgentModelRequirements';
import { createAgentModelRequirementsWithCommitments } from '../book-2.0/agent-source/createAgentModelRequirementsWithCommitments';
import { padBook, PADDING_LINES } from '../book-2.0/agent-source/padBook';
import { parseAgentSource } from '../book-2.0/agent-source/parseAgentSource';
import { parseParameters } from '../book-2.0/agent-source/parseParameters';
import { DEFAULT_BOOK, isValidBook, validateBook } from '../book-2.0/agent-source/string_book';
import {
    createBasicAgentModelRequirements,
    createEmptyAgentModelRequirements,
} from '../book-2.0/commitments/_base/createEmptyAgentModelRequirements';
import { NotYetImplementedCommitmentDefinition } from '../book-2.0/commitments/_base/NotYetImplementedCommitmentDefinition';
import {
    getAllCommitmentDefinitions,
    getAllCommitmentTypes,
    getCommitmentDefinition,
    isCommitmentSupported,
} from '../book-2.0/commitments/index';
import { generatePlaceholderAgentProfileImageUrl } from '../book-2.0/utils/generatePlaceholderAgentProfileImageUrl';
import { collectionToJson } from '../collection/collectionToJson';
import { createCollectionFromJson } from '../collection/constructors/createCollectionFromJson';
import { createCollectionFromPromise } from '../collection/constructors/createCollectionFromPromise';
import { createCollectionFromUrl } from '../collection/constructors/createCollectionFromUrl';
import { createSubcollection } from '../collection/constructors/createSubcollection';
import {
    ADMIN_EMAIL,
    ADMIN_GITHUB_NAME,
    API_REQUEST_TIMEOUT,
    BIG_DATASET_TRESHOLD,
    CLAIM,
    CLI_APP_ID,
    DEFAULT_BOOK_OUTPUT_PARAMETER_NAME,
    DEFAULT_BOOK_TITLE,
    DEFAULT_BOOKS_DIRNAME,
    DEFAULT_CSV_SETTINGS,
    DEFAULT_DOWNLOAD_CACHE_DIRNAME,
    DEFAULT_EXECUTION_CACHE_DIRNAME,
    DEFAULT_GET_PIPELINE_COLLECTION_FUNCTION_NAME,
    DEFAULT_INTERMEDIATE_FILES_STRATEGY,
    DEFAULT_IS_AUTO_INSTALLED,
    DEFAULT_IS_VERBOSE,
    DEFAULT_MAX_EXECUTION_ATTEMPTS,
    DEFAULT_MAX_FILE_SIZE,
    DEFAULT_MAX_KNOWLEDGE_SOURCES_SCRAPING_DEPTH,
    DEFAULT_MAX_KNOWLEDGE_SOURCES_SCRAPING_TOTAL,
    DEFAULT_MAX_PARALLEL_COUNT,
    DEFAULT_MAX_REQUESTS_PER_MINUTE,
    DEFAULT_PIPELINE_COLLECTION_BASE_FILENAME,
    DEFAULT_PROMPT_TASK_TITLE,
    DEFAULT_REMOTE_SERVER_URL,
    DEFAULT_SCRAPE_CACHE_DIRNAME,
    DEFAULT_TASK_SIMULATED_DURATION_MS,
    DEFAULT_TASK_TITLE,
    FAILED_VALUE_PLACEHOLDER,
    MAX_FILENAME_LENGTH,
    NAME,
    PENDING_VALUE_PLACEHOLDER,
    PLAYGROUND_APP_ID,
    PROMPTBOOK_CHAT_COLOR,
    PROMPTBOOK_COLOR,
    PROMPTBOOK_LOGO_URL,
    PROMPTBOOK_SYNTAX_COLORS,
    SET_IS_VERBOSE,
    USER_CHAT_COLOR,
} from '../config';
import { MODEL_ORDERS, MODEL_TRUST_LEVELS, ORDER_OF_PIPELINE_JSON, RESERVED_PARAMETER_NAMES } from '../constants';
import { compilePipeline } from '../conversion/compilePipeline';
import { parsePipeline } from '../conversion/parsePipeline';
import { pipelineJsonToString } from '../conversion/pipelineJsonToString';
import { prettifyPipelineString } from '../conversion/prettify/prettifyPipelineString';
import { extractParameterNamesFromTask } from '../conversion/utils/extractParameterNamesFromTask';
import { validatePipeline } from '../conversion/validation/validatePipeline';
import { CallbackInterfaceTools } from '../dialogs/callback/CallbackInterfaceTools';
import type { CallbackInterfaceToolsOptions } from '../dialogs/callback/CallbackInterfaceToolsOptions';
import { BoilerplateError } from '../errors/0-BoilerplateError';
import { PROMPTBOOK_ERRORS } from '../errors/0-index';
import { AbstractFormatError } from '../errors/AbstractFormatError';
import { AuthenticationError } from '../errors/AuthenticationError';
import { CollectionError } from '../errors/CollectionError';
import { EnvironmentMismatchError } from '../errors/EnvironmentMismatchError';
import { ExpectError } from '../errors/ExpectError';
import { KnowledgeScrapeError } from '../errors/KnowledgeScrapeError';
import { LimitReachedError } from '../errors/LimitReachedError';
import { MissingToolsError } from '../errors/MissingToolsError';
import { NotFoundError } from '../errors/NotFoundError';
import { NotYetImplementedError } from '../errors/NotYetImplementedError';
import { ParseError } from '../errors/ParseError';
import { PipelineExecutionError } from '../errors/PipelineExecutionError';
import { PipelineLogicError } from '../errors/PipelineLogicError';
import { PipelineUrlError } from '../errors/PipelineUrlError';
import { PromptbookFetchError } from '../errors/PromptbookFetchError';
import { UnexpectedError } from '../errors/UnexpectedError';
import { WrappedError } from '../errors/WrappedError';
import { createPipelineExecutor } from '../execution/createPipelineExecutor/00-createPipelineExecutor';
import { computeCosineSimilarity } from '../execution/createPipelineExecutor/computeCosineSimilarity';
import { embeddingVectorToString } from '../execution/embeddingVectorToString';
import { executionReportJsonToString } from '../execution/execution-report/executionReportJsonToString';
import type { ExecutionReportStringOptions } from '../execution/execution-report/ExecutionReportStringOptions';
import { ExecutionReportStringOptionsDefaults } from '../execution/execution-report/ExecutionReportStringOptions';
import { addUsage } from '../execution/utils/addUsage';
import { isPassingExpectations } from '../execution/utils/checkExpectations';
import { UNCERTAIN_USAGE, UNCERTAIN_ZERO_VALUE, ZERO_USAGE, ZERO_VALUE } from '../execution/utils/usage-constants';
import { usageToHuman } from '../execution/utils/usageToHuman';
import { usageToWorktime } from '../execution/utils/usageToWorktime';
import { CsvFormatError } from '../formats/csv/CsvFormatError';
import { CsvFormatParser } from '../formats/csv/CsvFormatParser';
import { MANDATORY_CSV_SETTINGS } from '../formats/csv/CsvSettings';
import { TextFormatParser } from '../formats/text/TextFormatParser';
import { BoilerplateFormfactorDefinition } from '../formfactors/_boilerplate/BoilerplateFormfactorDefinition';
import { ChatbotFormfactorDefinition } from '../formfactors/chatbot/ChatbotFormfactorDefinition';
import { CompletionFormfactorDefinition } from '../formfactors/completion/CompletionFormfactorDefinition';
import { GeneratorFormfactorDefinition } from '../formfactors/generator/GeneratorFormfactorDefinition';
import { GenericFormfactorDefinition } from '../formfactors/generic/GenericFormfactorDefinition';
import { ImageGeneratorFormfactorDefinition } from '../formfactors/image-generator/ImageGeneratorFormfactorDefinition';
import { FORMFACTOR_DEFINITIONS } from '../formfactors/index';
import { MatcherFormfactorDefinition } from '../formfactors/matcher/MatcherFormfactorDefinition';
import { SheetsFormfactorDefinition } from '../formfactors/sheets/SheetsFormfactorDefinition';
import { TranslatorFormfactorDefinition } from '../formfactors/translator/TranslatorFormfactorDefinition';
import { filterModels } from '../llm-providers/_common/filterModels';
import { $llmToolsMetadataRegister } from '../llm-providers/_common/register/$llmToolsMetadataRegister';
import { $llmToolsRegister } from '../llm-providers/_common/register/$llmToolsRegister';
import { createLlmToolsFromConfiguration } from '../llm-providers/_common/register/createLlmToolsFromConfiguration';
import { cacheLlmTools } from '../llm-providers/_common/utils/cache/cacheLlmTools';
import { countUsage } from '../llm-providers/_common/utils/count-total-usage/countUsage';
import { limitTotalUsage } from '../llm-providers/_common/utils/count-total-usage/limitTotalUsage';
import { getSingleLlmExecutionTools } from '../llm-providers/_multiple/getSingleLlmExecutionTools';
import { joinLlmExecutionTools } from '../llm-providers/_multiple/joinLlmExecutionTools';
import { MultipleLlmExecutionTools } from '../llm-providers/_multiple/MultipleLlmExecutionTools';
import { AgentLlmExecutionTools } from '../llm-providers/agent/AgentLlmExecutionTools';
import { createAgentLlmExecutionTools } from '../llm-providers/agent/createAgentLlmExecutionTools';
import { _AgentMetadata } from '../llm-providers/agent/register-configuration';
import { _AgentRegistration } from '../llm-providers/agent/register-constructor';
import { _AnthropicClaudeMetadataRegistration } from '../llm-providers/anthropic-claude/register-configuration';
import { _AzureOpenAiMetadataRegistration } from '../llm-providers/azure-openai/register-configuration';
import { _DeepseekMetadataRegistration } from '../llm-providers/deepseek/register-configuration';
import { _GoogleMetadataRegistration } from '../llm-providers/google/register-configuration';
import { _OllamaMetadataRegistration } from '../llm-providers/ollama/register-configuration';
import {
    _OpenAiAssistantMetadataRegistration,
    _OpenAiCompatibleMetadataRegistration,
    _OpenAiMetadataRegistration,
} from '../llm-providers/openai/register-configuration';
import { migratePipeline } from '../migrations/migratePipeline';
import { preparePersona } from '../personas/preparePersona';
import { book } from '../pipeline/book-notation';
import { isValidPipelineString } from '../pipeline/isValidPipelineString';
import { GENERIC_PIPELINE_INTERFACE } from '../pipeline/PipelineInterface/constants';
import { getPipelineInterface } from '../pipeline/PipelineInterface/getPipelineInterface';
import { isPipelineImplementingInterface } from '../pipeline/PipelineInterface/isPipelineImplementingInterface';
import { isPipelineInterfacesEqual } from '../pipeline/PipelineInterface/isPipelineInterfacesEqual';
import { EXPECTATION_UNITS } from '../pipeline/PipelineJson/Expectations';
import { validatePipelineString } from '../pipeline/validatePipelineString';
import { isPipelinePrepared } from '../prepare/isPipelinePrepared';
import { preparePipeline } from '../prepare/preparePipeline';
import { unpreparePipeline } from '../prepare/unpreparePipeline';
import { identificationToPromptbookToken } from '../remote-server/socket-types/_subtypes/identificationToPromptbookToken';
import { promptbookTokenToIdentification } from '../remote-server/socket-types/_subtypes/promptbookTokenToIdentification';
import { _BoilerplateScraperMetadataRegistration } from '../scrapers/_boilerplate/register-metadata';
import { prepareKnowledgePieces } from '../scrapers/_common/prepareKnowledgePieces';
import { $scrapersMetadataRegister } from '../scrapers/_common/register/$scrapersMetadataRegister';
import { $scrapersRegister } from '../scrapers/_common/register/$scrapersRegister';
import { makeKnowledgeSourceHandler } from '../scrapers/_common/utils/makeKnowledgeSourceHandler';
import { promptbookFetch } from '../scrapers/_common/utils/promptbookFetch';
import { _LegacyDocumentScraperMetadataRegistration } from '../scrapers/document-legacy/register-metadata';
import { _DocumentScraperMetadataRegistration } from '../scrapers/document/register-metadata';
import { _MarkdownScraperMetadataRegistration } from '../scrapers/markdown/register-metadata';
import { _MarkitdownScraperMetadataRegistration } from '../scrapers/markitdown/register-metadata';
import { _PdfScraperMetadataRegistration } from '../scrapers/pdf/register-metadata';
import { _WebsiteScraperMetadataRegistration } from '../scrapers/website/register-metadata';
import { BlackholeStorage } from '../storage/blackhole/BlackholeStorage';
import { MemoryStorage } from '../storage/memory/MemoryStorage';
import { PrefixStorage } from '../storage/utils/PrefixStorage';
import { $bookTranspilersRegister } from '../transpilers/_common/register/$bookTranspilersRegister';
import { OpenAiSdkTranspiler } from '../transpilers/openai-sdk/OpenAiSdkTranspiler';
import { MODEL_VARIANTS } from '../types/ModelVariant';
import { NonTaskSectionTypes, SectionTypes } from '../types/SectionType';
import { TaskTypes } from '../types/TaskType';
import { aboutPromptbookInformation } from '../utils/misc/aboutPromptbookInformation';
import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../version';

// Note: Exporting version from each package
export { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION };

// Note: Entities of the `@promptbook/core`
export {
    $bookTranspilersRegister,
    $llmToolsMetadataRegister,
    $llmToolsRegister,
    $scrapersMetadataRegister,
    $scrapersRegister,
    _AgentMetadata,
    _AgentRegistration,
    _AnthropicClaudeMetadataRegistration,
    _AzureOpenAiMetadataRegistration,
    _BoilerplateScraperMetadataRegistration,
    _DeepseekMetadataRegistration,
    _DocumentScraperMetadataRegistration,
    _GoogleMetadataRegistration,
    _LegacyDocumentScraperMetadataRegistration,
    _MarkdownScraperMetadataRegistration,
    _MarkitdownScraperMetadataRegistration,
    _OllamaMetadataRegistration,
    _OpenAiAssistantMetadataRegistration,
    _OpenAiCompatibleMetadataRegistration,
    _OpenAiMetadataRegistration,
    _PdfScraperMetadataRegistration,
    _WebsiteScraperMetadataRegistration,
    aboutPromptbookInformation,
    AbstractFormatError,
    addUsage,
    ADMIN_EMAIL,
    ADMIN_GITHUB_NAME,
    AgentLlmExecutionTools,
    API_REQUEST_TIMEOUT,
    AuthenticationError,
    BIG_DATASET_TRESHOLD,
    BlackholeStorage,
    BoilerplateError,
    BoilerplateFormfactorDefinition,
    book,
    cacheLlmTools,
    CallbackInterfaceTools,
    ChatbotFormfactorDefinition,
    CLAIM,
    CLI_APP_ID,
    CollectionError,
    collectionToJson,
    compilePipeline,
    CompletionFormfactorDefinition,
    computeCosineSimilarity,
    countUsage,
    createAgentLlmExecutionTools,
    createAgentModelRequirements,
    createAgentModelRequirementsWithCommitments,
    createBasicAgentModelRequirements,
    createCollectionFromJson,
    createCollectionFromPromise,
    createCollectionFromUrl,
    createEmptyAgentModelRequirements,
    createLlmToolsFromConfiguration,
    createPipelineExecutor,
    createSubcollection,
    CsvFormatError,
    CsvFormatParser,
    DEFAULT_BOOK,
    DEFAULT_BOOK_OUTPUT_PARAMETER_NAME,
    DEFAULT_BOOK_TITLE,
    DEFAULT_BOOKS_DIRNAME,
    DEFAULT_CSV_SETTINGS,
    DEFAULT_DOWNLOAD_CACHE_DIRNAME,
    DEFAULT_EXECUTION_CACHE_DIRNAME,
    DEFAULT_GET_PIPELINE_COLLECTION_FUNCTION_NAME,
    DEFAULT_INTERMEDIATE_FILES_STRATEGY,
    DEFAULT_IS_AUTO_INSTALLED,
    DEFAULT_IS_VERBOSE,
    DEFAULT_MAX_EXECUTION_ATTEMPTS,
    DEFAULT_MAX_FILE_SIZE,
    DEFAULT_MAX_KNOWLEDGE_SOURCES_SCRAPING_DEPTH,
    DEFAULT_MAX_KNOWLEDGE_SOURCES_SCRAPING_TOTAL,
    DEFAULT_MAX_PARALLEL_COUNT,
    DEFAULT_MAX_REQUESTS_PER_MINUTE,
    DEFAULT_PIPELINE_COLLECTION_BASE_FILENAME,
    DEFAULT_PROMPT_TASK_TITLE,
    DEFAULT_REMOTE_SERVER_URL,
    DEFAULT_SCRAPE_CACHE_DIRNAME,
    DEFAULT_TASK_SIMULATED_DURATION_MS,
    DEFAULT_TASK_TITLE,
    embeddingVectorToString,
    EnvironmentMismatchError,
    executionReportJsonToString,
    ExecutionReportStringOptionsDefaults,
    EXPECTATION_UNITS,
    ExpectError,
    extractParameterNamesFromTask,
    FAILED_VALUE_PLACEHOLDER,
    filterModels,
    FORMFACTOR_DEFINITIONS,
    generatePlaceholderAgentProfileImageUrl,
    GeneratorFormfactorDefinition,
    GENERIC_PIPELINE_INTERFACE,
    GenericFormfactorDefinition,
    getAllCommitmentDefinitions,
    getAllCommitmentTypes,
    getCommitmentDefinition,
    getPipelineInterface,
    getSingleLlmExecutionTools,
    identificationToPromptbookToken,
    ImageGeneratorFormfactorDefinition,
    isCommitmentSupported,
    isPassingExpectations,
    isPipelineImplementingInterface,
    isPipelineInterfacesEqual,
    isPipelinePrepared,
    isValidBook,
    isValidPipelineString,
    joinLlmExecutionTools,
    KnowledgeScrapeError,
    LimitReachedError,
    limitTotalUsage,
    makeKnowledgeSourceHandler,
    MANDATORY_CSV_SETTINGS,
    MatcherFormfactorDefinition,
    MAX_FILENAME_LENGTH,
    MemoryStorage,
    migratePipeline,
    MissingToolsError,
    MODEL_ORDERS,
    MODEL_TRUST_LEVELS,
    MODEL_VARIANTS,
    MultipleLlmExecutionTools,
    NAME,
    NonTaskSectionTypes,
    NotFoundError,
    NotYetImplementedCommitmentDefinition,
    NotYetImplementedError,
    OpenAiSdkTranspiler,
    ORDER_OF_PIPELINE_JSON,
    padBook,
    PADDING_LINES,
    parseAgentSource,
    ParseError,
    parseParameters,
    parsePipeline,
    PENDING_VALUE_PLACEHOLDER,
    PipelineExecutionError,
    pipelineJsonToString,
    PipelineLogicError,
    PipelineUrlError,
    PLAYGROUND_APP_ID,
    PrefixStorage,
    prepareKnowledgePieces,
    preparePersona,
    preparePipeline,
    prettifyPipelineString,
    PROMPTBOOK_CHAT_COLOR,
    PROMPTBOOK_COLOR,
    PROMPTBOOK_ERRORS,
    PROMPTBOOK_LOGO_URL,
    PROMPTBOOK_SYNTAX_COLORS,
    promptbookFetch,
    PromptbookFetchError,
    promptbookTokenToIdentification,
    REMOTE_SERVER_URLS,
    RESERVED_PARAMETER_NAMES,
    SectionTypes,
    SET_IS_VERBOSE,
    SheetsFormfactorDefinition,
    TaskTypes,
    TextFormatParser,
    TranslatorFormfactorDefinition,
    UNCERTAIN_USAGE,
    UNCERTAIN_ZERO_VALUE,
    UnexpectedError,
    unpreparePipeline,
    usageToHuman,
    usageToWorktime,
    USER_CHAT_COLOR,
    validateBook,
    validatePipeline,
    validatePipelineString,
    WrappedError,
    ZERO_USAGE,
    ZERO_VALUE,
};
export type { CallbackInterfaceToolsOptions, ExecutionReportStringOptions };
