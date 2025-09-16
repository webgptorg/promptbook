JavaScript execution engine for Promptbook, providing secure JavaScript code execution within promptbook pipelines and script tasks.

## 🎯 Purpose and Motivation

This package provides a secure JavaScript execution environment for Promptbook pipelines. It enables the execution of JavaScript code in `SCRIPT` tasks, allowing for complex data transformations, calculations, and logic within promptbook workflows while maintaining security and isolation.

## 🔧 High-Level Functionality

The package provides JavaScript execution capabilities:

-   **Script Task Execution**: Execute JavaScript code within promptbook `SCRIPT` tasks
-   **Variable Extraction**: Analyze JavaScript code to extract variable dependencies
-   **Postprocessing Functions**: Built-in JavaScript functions for common postprocessing tasks
-   **Secure Execution**: Safe execution environment with proper isolation
-   **Multiple Execution Modes**: Support for different JavaScript execution strategies

## ✨ Key Features

-   🔒 **Secure Execution** - Safe JavaScript execution with proper sandboxing
-   📝 **Script Tasks** - Execute JavaScript code within promptbook pipelines
-   🔧 **Variable Analysis** - Extract variable dependencies from JavaScript code
-   📊 **Postprocessing Functions** - Built-in functions for common data transformations
-   ⚡ **Multiple Execution Modes** - Different execution strategies for various use cases
-   🛡️ **Error Handling** - Comprehensive error handling for script execution
-   🎯 **Pipeline Integration** - Seamless integration with promptbook execution flow

## 📦 Exported Entities

### Version Information

-   `BOOK_LANGUAGE_VERSION` - Current book language version
-   `PROMPTBOOK_ENGINE_VERSION` - Current engine version

### Execution Tools

-   `JavascriptEvalExecutionTools` - JavaScript execution tools using eval
-   `JavascriptExecutionTools` - Standard JavaScript execution tools

### Postprocessing

-   `POSTPROCESSING_FUNCTIONS` - Built-in postprocessing functions for JavaScript

### Utilities

-   `extractVariablesFromJavascript` - Extract variable dependencies from JavaScript code

> 💡 This package provides JavaScript execution for promptbook applications. For the core functionality, see [@promptbook/core](#-packages) or install all packages with `npm i ptbk`
