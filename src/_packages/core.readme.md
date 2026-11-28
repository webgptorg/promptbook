The core package contains the fundamental logic and infrastructure for Promptbook. It provides the essential building blocks for creating, parsing, validating, and executing promptbooks, along with comprehensive error handling, LLM provider integrations, and execution utilities.

## 🎯 Purpose and Motivation

The core package serves as the foundation of the Promptbook ecosystem. It abstracts away the complexity of working with different LLM providers, provides a unified interface for prompt execution, and handles all the intricate details of pipeline management, parameter validation, and result processing.

## 🔧 High-Level Functionality

This package orchestrates the entire promptbook execution lifecycle:

-   **Pipeline Management**: Parse, validate, and compile promptbook definitions
-   **Execution Engine**: Create and manage pipeline executors with comprehensive error handling
-   **LLM Integration**: Unified interface for multiple LLM providers (OpenAI, Anthropic, Google, etc.)
-   **Parameter Processing**: Template parameter substitution and validation
-   **Knowledge Management**: Handle knowledge sources and scraping
-   **Storage Abstraction**: Flexible storage backends for caching and persistence
-   **Format Support**: Parse and validate various data formats (JSON, CSV, XML)

## ✨ Key Features

-   🚀 **Universal Pipeline Executor** - Execute promptbooks with any supported LLM provider
-   🔄 **Multi-Provider Support** - Seamlessly switch between OpenAI, Anthropic, Google, and other providers
-   📊 **Comprehensive Validation** - Validate promptbooks, parameters, and execution results
-   🎯 **Expectation Checking** - Built-in validation for output format, length, and content expectations
-   🧠 **Knowledge Integration** - Scrape and process knowledge from various sources
-   💾 **Flexible Storage** - Memory, filesystem, and custom storage backends
-   🔧 **Error Handling** - Detailed error types for debugging and monitoring
-   📈 **Usage Tracking** - Monitor token usage, costs, and performance metrics
-   🎨 **Format Parsers** - Support for JSON, CSV, XML, and text formats
-   🔀 **Pipeline Migration** - Upgrade and migrate pipeline definitions

## 📦 Exported Entities

### Version Information

-   `BOOK_LANGUAGE_VERSION` - Current book language version
-   `PROMPTBOOK_ENGINE_VERSION` - Current engine version

### Agent and Book Management

-   `createAgentModelRequirements` - Create model requirements for agents
-   `parseAgentSource` - Parse agent source code
-   `isValidBook` - Validate book format
-   `validateBook` - Comprehensive book validation
-   `DEFAULT_BOOK` - Default book template

### Commitment System

-   `createEmptyAgentModelRequirements` - Create empty model requirements
-   `createBasicAgentModelRequirements` - Create basic model requirements
-   `NotYetImplementedCommitmentDefinition` - Placeholder for future commitments
-   `getCommitmentDefinition` - Get specific commitment definition
-   `getAllCommitmentDefinitions` - Get all available commitment definitions
-   `getAllCommitmentTypes` - Get all commitment types
-   `isCommitmentSupported` - Check if commitment is supported

### Collection Management

-   `pipelineCollectionToJson` - Convert collection to JSON
-   `createPipelineCollectionFromJson` - Create collection from JSON data
-   `createPipelineCollectionFromPromise` - Create collection from async source
-   `createPipelineCollectionFromUrl` - Create collection from URL
-   `createPipelineSubcollection` - Create filtered subcollection

### Configuration Constants

-   `NAME` - Project name
-   `ADMIN_EMAIL` - Administrator email
-   `ADMIN_GITHUB_NAME` - GitHub username
-   `CLAIM` - Project claim/tagline
-   `DEFAULT_BOOK_TITLE` - Default book title
-   `DEFAULT_TASK_TITLE` - Default task title
-   `DEFAULT_PROMPT_TASK_TITLE` - Default prompt task title
-   `DEFAULT_BOOK_OUTPUT_PARAMETER_NAME` - Default output parameter name
-   `DEFAULT_MAX_FILE_SIZE` - Maximum file size limit
-   `BIG_DATASET_TRESHOLD` - Threshold for large datasets
-   `FAILED_VALUE_PLACEHOLDER` - Placeholder for failed values
-   `PENDING_VALUE_PLACEHOLDER` - Placeholder for pending values
-   `MAX_FILENAME_LENGTH` - Maximum filename length
-   `DEFAULT_INTERMEDIATE_FILES_STRATEGY` - Strategy for intermediate files
-   `DEFAULT_MAX_PARALLEL_COUNT` - Maximum parallel executions
-   `DEFAULT_MAX_EXECUTION_ATTEMPTS` - Maximum execution attempts
-   `DEFAULT_MAX_KNOWLEDGE_SOURCES_SCRAPING_DEPTH` - Knowledge scraping depth limit
-   `DEFAULT_MAX_KNOWLEDGE_SOURCES_SCRAPING_TOTAL` - Knowledge scraping total limit
-   `DEFAULT_BOOKS_DIRNAME` - Default books directory name
-   `DEFAULT_DOWNLOAD_CACHE_DIRNAME` - Default download cache directory
-   `DEFAULT_EXECUTION_CACHE_DIRNAME` - Default execution cache directory
-   `DEFAULT_SCRAPE_CACHE_DIRNAME` - Default scrape cache directory
-   `CLI_APP_ID` - CLI application identifier
-   `PLAYGROUND_APP_ID` - Playground application identifier
-   `DEFAULT_PIPELINE_COLLECTION_BASE_FILENAME` - Default collection filename
-   `DEFAULT_REMOTE_SERVER_URL` - Default remote server URL
-   `DEFAULT_CSV_SETTINGS` - Default CSV parsing settings
-   `DEFAULT_IS_VERBOSE` - Default verbosity setting
-   `SET_IS_VERBOSE` - Verbosity setter
-   `DEFAULT_IS_AUTO_INSTALLED` - Default auto-install setting
-   `DEFAULT_TASK_SIMULATED_DURATION_MS` - Default task simulation duration
-   `DEFAULT_GET_PIPELINE_COLLECTION_FUNCTION_NAME` - Default collection function name
-   `DEFAULT_MAX_REQUESTS_PER_MINUTE` - Rate limiting configuration
-   `API_REQUEST_TIMEOUT` - API request timeout
-   `PROMPTBOOK_LOGO_URL` - Official logo URL

### Model and Provider Constants

-   `MODEL_TRUST_LEVELS` - Trust levels for different models
-   `MODEL_ORDERS` - Ordering preferences for models
-   `ORDER_OF_PIPELINE_JSON` - JSON property ordering
-   `RESERVED_PARAMETER_NAMES` - Reserved parameter names

### Pipeline Processing

-   `compilePipeline` - Compile pipeline from source
-   `parsePipeline` - Parse pipeline definition
-   `pipelineJsonToString` - Convert pipeline JSON to string
-   `prettifyPipelineString` - Format pipeline string
-   `extractParameterNamesFromTask` - Extract parameter names
-   `validatePipeline` - Validate pipeline structure

### Dialog and Interface Tools

-   `CallbackInterfaceTools` - Callback-based interface tools
-   `CallbackInterfaceToolsOptions` - Options for callback tools (type)

### Error Handling

-   `BoilerplateError` - Base error class
-   `PROMPTBOOK_ERRORS` - All error types registry
-   `AbstractFormatError` - Abstract format validation error
-   `AuthenticationError` - Authentication failure error
-   `CollectionError` - Collection-related error
-   `EnvironmentMismatchError` - Environment compatibility error
-   `ExpectError` - Expectation validation error
-   `KnowledgeScrapeError` - Knowledge scraping error
-   `LimitReachedError` - Resource limit error
-   `MissingToolsError` - Missing tools error
-   `NotFoundError` - Resource not found error
-   `NotYetImplementedError` - Feature not implemented error
-   `ParseError` - Parsing error
-   `PipelineExecutionError` - Pipeline execution error
-   `PipelineLogicError` - Pipeline logic error
-   `PipelineUrlError` - Pipeline URL error
-   `PromptbookFetchError` - Fetch operation error
-   `UnexpectedError` - Unexpected error
-   `WrappedError` - Wrapped error container

### Execution Engine

-   `createPipelineExecutor` - Create pipeline executor
-   `computeCosineSimilarity` - Compute cosine similarity for embeddings
-   `embeddingVectorToString` - Convert embedding vector to string
-   `executionReportJsonToString` - Convert execution report to string
-   `ExecutionReportStringOptions` - Report formatting options (type)
-   `ExecutionReportStringOptionsDefaults` - Default report options

### Usage and Metrics

-   `addUsage` - Add usage metrics
-   `isPassingExpectations` - Check if expectations are met
-   `ZERO_VALUE` - Zero usage value constant
-   `UNCERTAIN_ZERO_VALUE` - Uncertain zero value constant
-   `ZERO_USAGE` - Zero usage object
-   `UNCERTAIN_USAGE` - Uncertain usage object
-   `usageToHuman` - Convert usage to human-readable format
-   `usageToWorktime` - Convert usage to work time estimate

### Format Parsers

-   `CsvFormatError` - CSV format error
-   `CsvFormatParser` - CSV format parser
-   `MANDATORY_CSV_SETTINGS` - Required CSV settings
-   `TextFormatParser` - Text format parser

### Form Factor Definitions

-   `BoilerplateFormfactorDefinition` - Boilerplate form factor
-   `ChatbotFormfactorDefinition` - Chatbot form factor
-   `CompletionFormfactorDefinition` - Completion form factor
-   `GeneratorFormfactorDefinition` - Generator form factor
-   `GenericFormfactorDefinition` - Generic form factor
-   `ImageGeneratorFormfactorDefinition` - Image generator form factor
-   `FORMFACTOR_DEFINITIONS` - All form factor definitions
-   `MatcherFormfactorDefinition` - Matcher form factor
-   `SheetsFormfactorDefinition` - Sheets form factor
-   `TranslatorFormfactorDefinition` - Translator form factor

### LLM Provider Integration

-   `filterModels` - Filter available models
-   `$llmToolsMetadataRegister` - LLM tools metadata registry
-   `$llmToolsRegister` - LLM tools registry
-   `createLlmToolsFromConfiguration` - Create tools from config
-   `cacheLlmTools` - Cache LLM tools
-   `countUsage` - Count total usage
-   `limitTotalUsage` - Limit total usage
-   `joinLlmExecutionTools` - Join multiple LLM tools
-   `MultipleLlmExecutionTools` - Multiple LLM tools container

### Provider Registrations

-   `_AnthropicClaudeMetadataRegistration` - Anthropic Claude registration
-   `_AzureOpenAiMetadataRegistration` - Azure OpenAI registration
-   `_DeepseekMetadataRegistration` - Deepseek registration
-   `_GoogleMetadataRegistration` - Google registration
-   `_OllamaMetadataRegistration` - Ollama registration
-   `_OpenAiMetadataRegistration` - OpenAI registration
-   `_OpenAiAssistantMetadataRegistration` - OpenAI Assistant registration
-   `_OpenAiCompatibleMetadataRegistration` - OpenAI Compatible registration

### Pipeline Management

-   `migratePipeline` - Migrate pipeline to newer version
-   `preparePersona` - Prepare persona for execution
-   `book` - Book notation utilities
-   `isValidPipelineString` - Validate pipeline string
-   `GENERIC_PIPELINE_INTERFACE` - Generic pipeline interface
-   `getPipelineInterface` - Get pipeline interface
-   `isPipelineImplementingInterface` - Check interface implementation
-   `isPipelineInterfacesEqual` - Compare pipeline interfaces
-   `EXPECTATION_UNITS` - Units for expectations
-   `validatePipelineString` - Validate pipeline string format

### Pipeline Preparation

-   `isPipelinePrepared` - Check if pipeline is prepared
-   `preparePipeline` - Prepare pipeline for execution
-   `unpreparePipeline` - Unprepare pipeline

### Remote Server Integration

-   `identificationToPromptbookToken` - Convert ID to token
-   `promptbookTokenToIdentification` - Convert token to ID

### Knowledge Scraping

-   `_BoilerplateScraperMetadataRegistration` - Boilerplate scraper registration
-   `prepareKnowledgePieces` - Prepare knowledge pieces
-   `$scrapersMetadataRegister` - Scrapers metadata registry
-   `$scrapersRegister` - Scrapers registry
-   `makeKnowledgeSourceHandler` - Create knowledge source handler
-   `promptbookFetch` - Fetch with promptbook context
-   `_LegacyDocumentScraperMetadataRegistration` - Legacy document scraper
-   `_DocumentScraperMetadataRegistration` - Document scraper registration
-   `_MarkdownScraperMetadataRegistration` - Markdown scraper registration
-   `_MarkitdownScraperMetadataRegistration` - Markitdown scraper registration
-   `_PdfScraperMetadataRegistration` - PDF scraper registration
-   `_WebsiteScraperMetadataRegistration` - Website scraper registration

### Storage Backends

-   `BlackholeStorage` - Blackhole storage (discards data)
-   `MemoryStorage` - In-memory storage
-   `PrefixStorage` - Prefixed storage wrapper

### Type Definitions

-   `MODEL_VARIANTS` - Available model variants
-   `NonTaskSectionTypes` - Non-task section types
-   `SectionTypes` - All section types
-   `TaskTypes` - Task types

### Server Configuration

-   `REMOTE_SERVER_URLS` - Remote server URLs

> 💡 This package does not make sense on its own, look at [all promptbook packages](#-packages) or just install all by `npm i ptbk`
