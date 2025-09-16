OpenAI integration for Promptbook, providing execution tools for OpenAI GPT models, OpenAI Assistants, and OpenAI-compatible APIs within the Promptbook ecosystem.

## 🎯 Purpose and Motivation

This package bridges the gap between Promptbook's unified pipeline execution system and OpenAI's powerful language models. It provides a standardized interface for accessing OpenAI's various services while maintaining compatibility with Promptbook's execution framework, enabling seamless integration with different OpenAI offerings.

## 🔧 High-Level Functionality

The package offers three main integration paths:

-   **Standard OpenAI API**: Direct integration with OpenAI's chat completions and embeddings
-   **OpenAI Assistants**: Integration with OpenAI's Assistant API (GPTs)
-   **OpenAI-Compatible APIs**: Support for third-party APIs that follow OpenAI's interface
-   **Model Management**: Automatic model selection and configuration
-   **Usage Tracking**: Built-in monitoring for tokens and costs

## ✨ Key Features

-   🤖 **Multiple OpenAI Integrations** - Support for standard API, Assistants, and compatible services
-   🔄 **Seamless Provider Switching** - Easy integration with other LLM providers
-   🎯 **Model Selection** - Access to all available OpenAI models with automatic selection
-   🔧 **Configuration Flexibility** - Support for custom endpoints, API keys, and parameters
-   📊 **Usage Tracking** - Built-in token usage and cost monitoring
-   🛡️ **Error Handling** - Comprehensive error handling and retry logic
-   🚀 **Performance Optimization** - Caching and request optimization
-   🔌 **OpenAI-Compatible Server** - Use Promptbook books as OpenAI-compatible models

## 📦 Exported Entities

### Version Information

-   `BOOK_LANGUAGE_VERSION` - Current book language version
-   `PROMPTBOOK_ENGINE_VERSION` - Current engine version

### Execution Tools Creation Functions

-   `createOpenAiAssistantExecutionTools` - Create OpenAI Assistant execution tools
-   `createOpenAiCompatibleExecutionTools` - Create OpenAI-compatible execution tools
-   `createOpenAiExecutionTools` - Create standard OpenAI execution tools

### Model Information

-   `OPENAI_MODELS` - Available OpenAI models configuration

### Execution Tools Classes

-   `OpenAiAssistantExecutionTools` - OpenAI Assistant execution tools class
-   `OpenAiCompatibleExecutionTools` - OpenAI-compatible execution tools class
-   `OpenAiExecutionTools` - Standard OpenAI execution tools class

### Configuration Types

-   `OpenAiAssistantExecutionToolsOptions` - Configuration options for OpenAI Assistant tools (type)
-   `OpenAiCompatibleExecutionToolsOptions` - Configuration options for OpenAI-compatible tools (type)
-   `OpenAiCompatibleExecutionToolsNonProxiedOptions` - Non-proxied configuration options (type)
-   `OpenAiCompatibleExecutionToolsProxiedOptions` - Proxied configuration options (type)
-   `OpenAiExecutionToolsOptions` - Configuration options for standard OpenAI tools (type)

### Provider Registrations

-   `_OpenAiRegistration` - Standard OpenAI provider registration
-   `_OpenAiAssistantRegistration` - OpenAI Assistant provider registration
-   `_OpenAiCompatibleRegistration` - OpenAI-compatible provider registration

> 💡 This package provides OpenAI integration for promptbook applications. For the core functionality, see [@promptbook/core](#-packages) or install all packages with `npm i ptbk`
