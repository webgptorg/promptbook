The types package provides comprehensive TypeScript type definitions for all Promptbook entities. It enables type-safe development when working with Promptbook APIs, ensuring compile-time validation and excellent IDE support.

## 🎯 Purpose and Motivation

This package centralizes all TypeScript type definitions used throughout the Promptbook ecosystem. It enables developers to write type-safe code when working with promptbooks, pipelines, LLM providers, and other Promptbook components, providing excellent IntelliSense and compile-time error checking.

## 🔧 High-Level Functionality

The package provides type definitions for:
- **Pipeline Structures**: Complete type definitions for promptbook JSON structures
- **Execution Types**: Types for pipeline execution, results, and error handling
- **LLM Provider Types**: Configuration and option types for all supported providers
- **Command Types**: Type definitions for all promptbook commands
- **Utility Types**: Helper types for common patterns and data structures
- **Component Types**: React component prop types for UI components

## ✨ Key Features

- 📝 **Complete Type Coverage** - Types for all Promptbook entities and APIs
- 🔒 **Type Safety** - Compile-time validation and error prevention
- 💡 **Excellent IntelliSense** - Rich IDE support with autocomplete and documentation
- 🏗️ **Structural Types** - Detailed types for promptbook JSON structures
- 🔧 **Provider-Agnostic** - Generic types that work across all LLM providers
- 📊 **Execution Types** - Comprehensive types for pipeline execution and results
- 🎨 **Component Types** - React component prop types for UI development
- 🔄 **Version Compatibility** - Types that evolve with the Promptbook ecosystem

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
- `AgentBasicInformation` - Basic agent information structure
- `AgentModelRequirements` - Model requirements for agents
- `string_book` - Book content string type
- `BookCommitment` - Book commitment structure
- `CommitmentDefinition` - Commitment definition interface
- `ParsedCommitment` - Parsed commitment structure

### Component Types
- `AvatarChipProps` - Avatar chip component props
- `AvatarChipFromSourceProps` - Avatar chip from source props
- `AvatarProfileProps` - Avatar profile component props
- `AvatarProfileFromSourceProps` - Avatar profile from source props
- `BookEditorProps` - Book editor component props
- `ChatProps` - Chat component props
- `LlmChatProps` - LLM chat component props
- `ChatMessage` - Chat message structure
- `ChatParticipant` - Chat participant information

### Collection and Pipeline Types
- `PipelineCollection` - Pipeline collection interface
- `PipelineJson` - Complete pipeline JSON structure
- `PipelineString` - Pipeline string format
- `PipelineInterface` - Pipeline interface definition
- `TaskJson` - Task JSON structure
- `PromptTaskJson` - Prompt task structure
- `ScriptTaskJson` - Script task structure
- `SimpleTaskJson` - Simple task structure
- `DialogTaskJson` - Dialog task structure
- `CommonTaskJson` - Common task properties

### Command Types
- `Command` - Base command interface
- `CommandParser` - Command parser interface
- `CommandType` - Command type enumeration
- `CommandUsagePlace` - Command usage context
- `BookVersionCommand` - Book version command
- `ExpectCommand` - Expect command structure
- `ForeachCommand` - Foreach command structure
- `FormatCommand` - Format command structure
- `FormfactorCommand` - Formfactor command structure
- `KnowledgeCommand` - Knowledge command structure
- `ModelCommand` - Model command structure
- `ParameterCommand` - Parameter command structure
- `PersonaCommand` - Persona command structure
- `PostprocessCommand` - Postprocess command structure

### Execution Types
- `ExecutionTools` - Execution tools interface
- `LlmExecutionTools` - LLM execution tools interface
- `PipelineExecutor` - Pipeline executor interface
- `PipelineExecutorResult` - Execution result structure
- `ExecutionTask` - Execution task structure
- `ExecutionReportJson` - Execution report structure
- `PromptResult` - Prompt execution result
- `Usage` - Usage tracking structure
- `AvailableModel` - Available model information

### LLM Provider Configuration Types
- `AnthropicClaudeExecutionToolsOptions` - Anthropic Claude configuration
- `OpenAiExecutionToolsOptions` - OpenAI configuration
- `AzureOpenAiExecutionToolsOptions` - Azure OpenAI configuration
- `GoogleExecutionToolsOptions` - Google configuration
- `DeepseekExecutionToolsOptions` - Deepseek configuration
- `OllamaExecutionToolsOptions` - Ollama configuration
- `VercelExecutionToolsOptions` - Vercel configuration

### Parameter and Data Types
- `ParameterJson` - Parameter definition structure
- `InputParameterJson` - Input parameter structure
- `OutputParameterJson` - Output parameter structure
- `Parameters` - Parameter collection type
- `Expectations` - Expectation validation structure
- `PersonaJson` - Persona definition structure
- `KnowledgeSourceJson` - Knowledge source structure

### Utility and Helper Types
- `string_prompt` - Prompt string type
- `string_template` - Template string type
- `string_parameter_name` - Parameter name type
- `string_model_name` - Model name type
- `string_url` - URL string type
- `string_filename` - Filename string type
- `number_tokens` - Token count type
- `number_usd` - USD amount type
- `ModelVariant` - Model variant enumeration
- `ScriptLanguage` - Script language enumeration
- `TaskType` - Task type enumeration

### Remote Server Types
- `RemoteServerOptions` - Remote server configuration
- `RemoteClientOptions` - Remote client configuration
- `Identification` - User identification structure

### Storage and Scraper Types
- `PromptbookStorage` - Storage interface
- `Scraper` - Scraper interface
- `ScraperConstructor` - Scraper constructor type
- `Converter` - Content converter interface

_Note: `@promptbook/types` does not export brand-specific types like `OpenAiExecutionToolsOptions`, `ClaudeExecutionToolsOptions`, `LangchainExecutionToolsOptions`,... etc._
