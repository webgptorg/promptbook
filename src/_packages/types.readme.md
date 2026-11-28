Comprehensive TypeScript type definitions for all Promptbook entities, enabling type-safe development and excellent IDE support throughout the Promptbook ecosystem.

## 🎯 Purpose and Motivation

This package centralizes all TypeScript type definitions used throughout the Promptbook ecosystem. It enables developers to write type-safe code when working with promptbooks, pipelines, LLM providers, and other Promptbook components, providing excellent IntelliSense and compile-time error checking.

## 🔧 High-Level Functionality

The package provides type definitions for:

-   **Pipeline Structures**: Complete type definitions for promptbook JSON structures
-   **Execution Types**: Types for pipeline execution, results, and error handling
-   **LLM Provider Types**: Configuration and option types for all supported providers
-   **Command Types**: Type definitions for all promptbook commands
-   **Utility Types**: Helper types for common patterns and data structures
-   **Component Types**: React component prop types for UI components

## ✨ Key Features

-   📝 **Complete Type Coverage** - Types for all Promptbook entities and APIs
-   🔒 **Type Safety** - Compile-time validation and error prevention
-   💡 **Excellent IntelliSense** - Rich IDE support with autocomplete and documentation
-   🏗️ **Structural Types** - Detailed types for promptbook JSON structures
-   🔧 **Provider-Agnostic** - Generic types that work across all LLM providers
-   📊 **Execution Types** - Comprehensive types for pipeline execution and results
-   🎨 **Component Types** - React component prop types for UI development
-   🔄 **Version Compatibility** - Types that evolve with the Promptbook ecosystem

## Usage Example

```typescript
import type { PipelineJson } from '@promptbook/types';
import { compilePipeline } from '@promptbook/core';

const promptbook: PipelineJson = compilePipeline(
    spaceTrim(`

        # ✨ Example prompt

        -   OUTPUT PARAMETER {greeting}


        ## 💬 Prompt

        \`\`\`text
        Hello
        \`\`\`

        -> {greeting}

    `),
);
```

## 📦 Exported Type Categories

### Agent and Book Types

-   `AgentBasicInformation` - Basic agent information structure (type)
-   `AgentModelRequirements` - Model requirements for agents (type)
-   `string_book` - Book content string type (type)
-   `BookCommitment` - Book commitment structure (type)
-   `CommitmentDefinition` - Commitment definition interface (type)
-   `ParsedCommitment` - Parsed commitment structure (type)

### Component Types

-   `AvatarChipProps` - Avatar chip component props (type)
-   `AvatarChipFromSourceProps` - Avatar chip from source props (type)
-   `AvatarProfileProps` - Avatar profile component props (type)
-   `AvatarProfileFromSourceProps` - Avatar profile from source props (type)
-   `BookEditorProps` - Book editor component props (type)
-   `ChatProps` - Chat component props (type)
-   `LlmChatProps` - LLM chat component props (type)
-   `ChatMessage` - Chat message structure (type)
-   `ChatParticipant` - Chat participant information (type)

### Collection and Pipeline Types

-   `PipelineCollection` - Pipeline collection interface (type)
-   `PipelineJson` - Complete pipeline JSON structure (type)
-   `PipelineString` - Pipeline string format (type)
-   `PipelineInterface` - Pipeline interface definition (type)
-   `TaskJson` - Task JSON structure (type)
-   `PromptTaskJson` - Prompt task structure (type)
-   `ScriptTaskJson` - Script task structure (type)
-   `SimpleTaskJson` - Simple task structure (type)
-   `DialogTaskJson` - Dialog task structure (type)
-   `CommonTaskJson` - Common task properties (type)

### Command Types

-   `Command` - Base command interface (type)
-   `CommandParser` - Command parser interface (type)
-   `PipelineBothCommandParser` - Pipeline both command parser (type)
-   `PipelineHeadCommandParser` - Pipeline head command parser (type)
-   `PipelineTaskCommandParser` - Pipeline task command parser (type)
-   `CommandParserInput` - Command parser input (type)
-   `CommandType` - Command type enumeration (type)
-   `CommandUsagePlace` - Command usage context (type)
-   `BookVersionCommand` - Book version command (type)
-   `ExpectCommand` - Expect command structure (type)
-   `ForeachCommand` - Foreach command structure (type)
-   `ForeachJson` - Foreach JSON structure (type)
-   `FormatCommand` - Format command structure (type)
-   `FormfactorCommand` - Formfactor command structure (type)
-   `JokerCommand` - Joker command structure (type)
-   `KnowledgeCommand` - Knowledge command structure (type)
-   `ModelCommand` - Model command structure (type)
-   `ParameterCommand` - Parameter command structure (type)
-   `PersonaCommand` - Persona command structure (type)
-   `PostprocessCommand` - Postprocess command structure (type)
-   `SectionCommand` - Section command structure (type)
-   `UrlCommand` - URL command structure (type)
-   `ActionCommand` - Action command structure (type)
-   `InstrumentCommand` - Instrument command structure (type)

### Execution Types

-   `ExecutionTools` - Execution tools interface (type)
-   `LlmExecutionTools` - LLM execution tools interface (type)
-   `LlmExecutionToolsConstructor` - LLM execution tools constructor (type)
-   `PipelineExecutor` - Pipeline executor interface (type)
-   `PipelineExecutorResult` - Execution result structure (type)
-   `ExecutionTask` - Execution task structure (type)
-   `PreparationTask` - Preparation task structure (type)
-   `task_status` - Task status type (type)
-   `AbstractTask` - Abstract task interface (type)
-   `Task` - Task interface (type)
-   `ExecutionReportJson` - Execution report structure (type)
-   `ExecutionPromptReportJson` - Execution prompt report structure (type)
-   `ExecutionReportString` - Execution report string (type)
-   `ExecutionReportStringOptions` - Report formatting options (type)
-   `PromptResult` - Prompt execution result (type)
-   `CompletionPromptResult` - Completion prompt result (type)
-   `ChatPromptResult` - Chat prompt result (type)
-   `EmbeddingPromptResult` - Embedding prompt result (type)
-   `Usage` - Usage tracking structure (type)
-   `UsageCounts` - Usage counts structure (type)
-   `UncertainNumber` - Uncertain number type (type)
-   `AvailableModel` - Available model information (type)
-   `AbstractTaskResult` - Abstract task result (type)
-   `EmbeddingVector` - Embedding vector type (type)

### LLM Provider Configuration Types

-   `AnthropicClaudeExecutionToolsOptions` - Anthropic Claude configuration (type)
-   `AnthropicClaudeExecutionToolsNonProxiedOptions` - Anthropic Claude non-proxied options (type)
-   `AnthropicClaudeExecutionToolsProxiedOptions` - Anthropic Claude proxied options (type)
-   `OpenAiExecutionToolsOptions` - OpenAI configuration (type)
-   `OpenAiAssistantExecutionToolsOptions` - OpenAI Assistant configuration (type)
-   `OpenAiCompatibleExecutionToolsOptions` - OpenAI Compatible configuration (type)
-   `OpenAiCompatibleExecutionToolsNonProxiedOptions` - OpenAI Compatible non-proxied options (type)
-   `OpenAiCompatibleExecutionToolsProxiedOptions` - OpenAI Compatible proxied options (type)
-   `AzureOpenAiExecutionToolsOptions` - Azure OpenAI configuration (type)
-   `GoogleExecutionToolsOptions` - Google configuration (type)
-   `DeepseekExecutionToolsOptions` - Deepseek configuration (type)
-   `OllamaExecutionToolsOptions` - Ollama configuration (type)
-   `VercelExecutionToolsOptions` - Vercel configuration (type)
-   `VercelProvider` - Vercel provider type (type)

### Parameter and Data Types

-   `ParameterJson` - Parameter definition structure (type)
-   `InputParameterJson` - Input parameter structure (type)
-   `IntermediateParameterJson` - Intermediate parameter structure (type)
-   `OutputParameterJson` - Output parameter structure (type)
-   `CommonParameterJson` - Common parameter properties (type)
-   `Parameters` - Parameter collection type (type)
-   `InputParameters` - Input parameters type (type)
-   `Expectations` - Expectation validation structure (type)
-   `ExpectationUnit` - Expectation unit type (type)
-   `ExpectationAmount` - Expectation amount type (type)
-   `PersonaJson` - Persona definition structure (type)
-   `PersonaPreparedJson` - Prepared persona structure (type)
-   `KnowledgeSourceJson` - Knowledge source structure (type)
-   `KnowledgeSourcePreparedJson` - Prepared knowledge source structure (type)
-   `KnowledgePiecePreparedJson` - Prepared knowledge piece structure (type)

### Utility and Helper Types

-   `string_prompt` - Prompt string type (type)
-   `string_template` - Template string type (type)
-   `string_text_prompt` - Text prompt string type (type)
-   `string_chat_prompt` - Chat prompt string type (type)
-   `string_system_message` - System message string type (type)
-   `string_completion_prompt` - Completion prompt string type (type)
-   `string_parameter_name` - Parameter name type (type)
-   `string_parameter_value` - Parameter value type (type)
-   `string_reserved_parameter_name` - Reserved parameter name type (type)
-   `ReservedParameters` - Reserved parameters type (type)
-   `string_model_name` - Model name type (type)
-   `string_url` - URL string type (type)
-   `string_filename` - Filename string type (type)
-   `string_absolute_filename` - Absolute filename type (type)
-   `string_relative_filename` - Relative filename type (type)
-   `string_dirname` - Directory name type (type)
-   `string_absolute_dirname` - Absolute directory name type (type)
-   `string_relative_dirname` - Relative directory name type (type)
-   `number_tokens` - Token count type (type)
-   `number_usd` - USD amount type (type)
-   `ModelVariant` - Model variant enumeration (type)
-   `ScriptLanguage` - Script language enumeration (type)
-   `TaskType` - Task type enumeration (type)
-   `SectionType` - Section type enumeration (type)
-   `ModelRequirements` - Model requirements type (type)
-   `CompletionModelRequirements` - Completion model requirements (type)
-   `ChatModelRequirements` - Chat model requirements (type)
-   `EmbeddingModelRequirements` - Embedding model requirements (type)

### Remote Server Types

-   `RemoteServerOptions` - Remote server configuration (type)
-   `AnonymousRemoteServerOptions` - Anonymous remote server options (type)
-   `ApplicationRemoteServerOptions` - Application remote server options (type)
-   `ApplicationRemoteServerClientOptions` - Application remote server client options (type)
-   `RemoteClientOptions` - Remote client configuration (type)
-   `Identification` - User identification structure (type)
-   `ApplicationModeIdentification` - Application mode identification (type)
-   `AnonymousModeIdentification` - Anonymous mode identification (type)
-   `LoginRequest` - Login request structure (type)
-   `LoginResponse` - Login response structure (type)
-   `RemoteServer` - Remote server interface (type)

### Storage and Scraper Types

-   `PromptbookStorage` - Storage interface (type)
-   `FileCacheStorageOptions` - File cache storage options (type)
-   `IndexedDbStorageOptions` - IndexedDB storage options (type)
-   `Scraper` - Scraper interface (type)
-   `ScraperConstructor` - Scraper constructor type (type)
-   `ScraperSourceHandler` - Scraper source handler (type)
-   `ScraperIntermediateSource` - Scraper intermediate source (type)
-   `ScraperAndConverterMetadata` - Scraper and converter metadata (type)
-   `Converter` - Content converter interface (type)

### Additional Types

-   `Prompt` - Prompt interface (type)
-   `CompletionPrompt` - Completion prompt interface (type)
-   `ChatPrompt` - Chat prompt interface (type)
-   `EmbeddingPrompt` - Embedding prompt interface (type)
-   `NonEmptyArray` - Non-empty array type (type)
-   `NonEmptyReadonlyArray` - Non-empty readonly array type (type)
-   `IntermediateFilesStrategy` - Intermediate files strategy (type)
-   `string_promptbook_version` - Promptbook version string type (type)

> 💡 This package provides TypeScript types for promptbook applications. For runtime functionality, see [@promptbook/core](#-packages) or install all packages with `npm i ptbk`
