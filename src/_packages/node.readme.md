The Node.js package provides Node.js-specific functionality for Promptbook, including filesystem operations, command execution, and automatic provider configuration. It serves as the bridge between Promptbook's core functionality and Node.js runtime capabilities.

## 🎯 Purpose and Motivation

This package extends Promptbook's core functionality with Node.js-specific features that are essential for server-side and desktop applications. It provides filesystem access, command execution, automatic LLM provider detection, and other Node.js runtime capabilities that enable full-featured Promptbook applications.

## 🔧 High-Level Functionality

The package provides Node.js-specific integrations and utilities:

-   **Filesystem Operations**: Read promptbooks from directories and manage file-based collections
-   **Automatic Provider Setup**: Detect and configure LLM providers from environment variables
-   **Command Execution**: Execute system commands and scripts
-   **Knowledge Scraping**: Node.js-specific scrapers for various content sources
-   **File-based Storage**: Persistent storage using the filesystem
-   **Environment Integration**: Seamless integration with Node.js environment and tooling

## ✨ Key Features

-   📁 **Directory-based Collections** - Load promptbook collections from filesystem directories
-   🔧 **Auto-configuration** - Automatically detect and configure LLM providers from environment
-   💾 **File Storage** - Persistent caching and storage using the filesystem
-   🛠️ **Command Execution** - Execute system commands and scripts from promptbooks
-   🌐 **Knowledge Scraping** - Scrape content from files, websites, and other sources
-   🔌 **Provider Detection** - Automatically discover available LLM providers
-   📊 **Executable Management** - Manage and execute external tools and scripts
-   🚀 **Performance Optimization** - File-based caching for improved performance

## 📦 Exported Entities

### Version Information

-   `BOOK_LANGUAGE_VERSION` - Current book language version
-   `PROMPTBOOK_ENGINE_VERSION` - Current engine version

### Collection Management

-   `createPipelineCollectionFromDirectory` - Create promptbook collection from filesystem directory

### Provider Configuration

-   `$provideExecutablesForNode` - Provide executable tools for Node.js environment
-   `$provideExecutionToolsForNode` - Auto-configure all execution tools from environment
-   `$provideLlmToolsConfigurationFromEnv` - Create LLM tools configuration from environment variables
-   `$provideLlmToolsFromEnv` - Create LLM tools from environment variables
-   `$provideFilesystemForNode` - Provide filesystem access for Node.js
-   `$provideScrapersForNode` - Provide knowledge scrapers for Node.js environment
-   `$provideScriptingForNode` - Provide scripting capabilities for Node.js

### Storage

-   `FileCacheStorage` - File-based cache storage implementation

### Command Execution

-   `$execCommand` - Execute single system command
-   `$execCommands` - Execute multiple system commands

> 💡 This package does not make sense on its own, look at [all promptbook packages](#-packages) or just install all by `npm i ptbk`
