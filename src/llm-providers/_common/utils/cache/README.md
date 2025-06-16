# Cache Validation for LLM Tools

This module provides functionality to prevent caching of LLM results that don't meet Promptbook expectations, even when the LLM returns a technically valid response.

## Problem

Previously, when an LLM returned a valid response (no technical errors) but the response didn't meet Promptbook expectations (like format requirements, length constraints, etc.), the result would still be cached. This meant that subsequent executions would retrieve the cached invalid result instead of attempting to get a valid one.

## Solution

The cache validation mechanism allows you to specify validation logic that determines whether a result should be cached based on expectations and format requirements.

## Usage

### Basic Usage with Expectation Validator

```typescript
import { cacheLlmTools, createExpectationValidator } from '@promptbook/core';
import { FileCacheStorage } from '@promptbook/node';

// Create your LLM tools
const llmTools = /* your LLM tools */;

// Create the expectation validator
const validator = createExpectationValidator();

// Apply caching with validation
const cachedLlmTools = cacheLlmTools(llmTools, {
    storage: new FileCacheStorage(/* options */),
    validateForCaching: validator,
    isVerbose: true, // Optional: for debugging
});
```

### Custom Validation Logic

You can also provide your own validation function:

```typescript
import { cacheLlmTools } from '@promptbook/core';
import type { CacheValidationResult } from '@promptbook/core';

const customValidator = (prompt, result) => {
    // Your custom validation logic
    if (result.content && result.content.includes('error')) {
        return {
            shouldCache: false,
            suppressionReason: 'Result contains error message',
        };
    }
    
    return { shouldCache: true };
};

const cachedLlmTools = cacheLlmTools(llmTools, {
    storage: /* your storage */,
    validateForCaching: customValidator,
});
```

## How It Works

1. **LLM Execution**: The LLM is called and returns a result
2. **Technical Validation**: Basic checks for null/undefined content and technical errors
3. **Custom Validation**: If provided, the `validateForCaching` function is called
4. **Caching Decision**: Result is cached only if all validations pass

## Validation Checks

The built-in `createExpectationValidator()` performs these checks:

- **Format Validation**: Ensures JSON format requirements are met
- **Expectation Validation**: Checks length, word count, and other expectations
- **Content Validation**: Ensures content is not null or empty

## Benefits

- **Improved Reliability**: Invalid results are not cached, forcing retry attempts
- **Better User Experience**: Users get valid results instead of cached invalid ones
- **Debugging Support**: Verbose logging shows why caching was suppressed
- **Flexibility**: Custom validation logic can be implemented for specific use cases

## Configuration Options

```typescript
type CacheLlmToolsOptions = {
    storage: PromptbookStorage<CacheItem>;
    isCacheReloaded?: boolean;
    isVerbose?: boolean;
    validateForCaching?: (prompt: Prompt, result: PromptResult) => CacheValidationResult;
};
```

## Example Scenarios

### Scenario 1: JSON Format Requirement
```typescript
// Pipeline expects JSON but LLM returns plain text
// Without validation: Invalid result gets cached
// With validation: Result is not cached, retry attempts continue
```

### Scenario 2: Length Expectations
```typescript
// Pipeline expects at least 100 words but LLM returns 50 words
// Without validation: Short result gets cached
// With validation: Result is not cached, retry attempts continue
```

### Scenario 3: Custom Business Logic
```typescript
// Custom validation for specific content requirements
const businessValidator = (prompt, result) => {
    if (!result.content.includes('required_keyword')) {
        return {
            shouldCache: false,
            suppressionReason: 'Missing required keyword',
        };
    }
    return { shouldCache: true };
};
