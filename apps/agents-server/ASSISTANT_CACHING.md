# Enhanced Assistant Caching in Agents Server

## Overview

This document describes the enhanced caching mechanism for OpenAI Assistants created for agents on the Agents Server. The implementation improves resource efficiency and performance by allowing agents with similar configurations to share the same underlying OpenAI Assistant instance.

## Problem Statement

Previously, OpenAI Assistants were created every time a chat session was started. While there was basic caching based on the agent hash, the implementation was:

1. **Not DRY**: Caching logic was duplicated in multiple places
2. **Not extensible**: Hard to add new configuration parameters (model, temperature, tools)
3. **Not flexible**: No option to choose between strict or enhanced caching strategies

## Solution

We've implemented a centralized, extensible assistant caching system with the following components:

### 1. AssistantCacheManager (`src/utils/cache/AssistantCacheManager.ts`)

A class that manages the complete lifecycle of OpenAI Assistants:

- **Cache lookup**: Checks database for existing assistants
- **Assistant creation**: Creates new assistants when cache miss occurs
- **Cache storage**: Persists assistant metadata in the database
- **Cache invalidation**: Provides methods to clear cache when needed

**Key Features:**
- Detailed logging for cache hits and misses
- Configurable verbosity
- Clean separation of concerns
- Error handling and validation

**Example Usage:**
```typescript
const assistantCacheManager = new AssistantCacheManager({ isVerbose: true });
const assistantResult = await assistantCacheManager.getOrCreateAssistant(
    agentSource,
    agentName,
    baseOpenAiTools,
    { includeDynamicContext: true } // Caching mode
);
```

### 2. Cache Key Computation (`src/utils/cache/computeAssistantCacheKey.ts`)

Utilities for computing unique cache keys based on assistant configuration:

#### `extractAssistantConfiguration(agentSource, options)`

Extracts the configuration that uniquely identifies an assistant from the agent source.

**Parameters:**
- `agentSource`: The full agent source (may include dynamic CONTEXT lines)
- `options.includeDynamicContext`: Whether to include CONTEXT lines (default: true)

**Returns:**
```typescript
{
    baseAgentSource: string_book,  // Agent source for configuration
    name: string,                   // Assistant name
    instructions: string,           // System instructions (PERSONA + optional CONTEXT)
    model?: string,                 // Future: model name
    temperature?: number,           // Future: temperature setting
    tools?: ReadonlyArray<unknown>  // Future: tools configuration
}
```

#### `computeAssistantCacheKey(configuration)`

Computes a SHA-256 hash of the assistant configuration to use as the cache key.

**What's included in the cache key:**
- Assistant name
- Instructions (base persona + optional context)
- Base agent source (includes all commitments: PERSONA, RULE, KNOWLEDGE, etc.)
- Future: model, temperature, tools when they become configurable

### 3. Integration in handleChatCompletion (`src/utils/handleChatCompletion.ts`)

The main chat completion handler now uses `AssistantCacheManager` instead of inline caching logic.

**Before:**
```typescript
// Duplicated caching logic
const { data: assistantCache } = await supabase
    .from(await $getTableName('OpenAiAssistantCache'))
    .select('assistantId')
    .eq('agentHash', agentHash)
    .single();

if (assistantCache?.assistantId) {
    // Reuse logic
} else {
    // Create logic with duplicated code
}
```

**After:**
```typescript
// Clean, centralized caching
const assistantCacheManager = new AssistantCacheManager({ isVerbose: true });
const assistantResult = await assistantCacheManager.getOrCreateAssistant(
    agentSource,
    agentName,
    baseOpenAiTools,
    { includeDynamicContext: true }
);
```

## Caching Modes

The system supports two caching modes:

### 1. Strict Caching (Default, Backward Compatible)

**Configuration:** `{ includeDynamicContext: true }`

Includes the full agent configuration in the cache key, including any dynamic CONTEXT lines added from system messages.

**When to use:**
- When you want exact matching of assistants
- When CONTEXT is critical to the assistant's behavior
- For backward compatibility with existing systems

**Example:**
```typescript
// Agent A: PERSONA "You are helpful" + CONTEXT "Be formal"
// Agent B: PERSONA "You are helpful" + CONTEXT "Be casual"
// Result: Two separate assistants (cache keys differ)
```

### 2. Enhanced Caching (Better Resource Reuse)

**Configuration:** `{ includeDynamicContext: false }`

Excludes dynamic CONTEXT lines from the cache key, allowing better reuse of assistants.

**When to use:**
- When you want better resource efficiency
- When agents have similar base configurations but different contexts
- When CONTEXT can be handled per-request instead of per-assistant

**Example:**
```typescript
// Agent A: PERSONA "You are helpful" + CONTEXT "Be formal"
// Agent B: PERSONA "You are helpful" + CONTEXT "Be casual"
// Result: One shared assistant (cache keys match on base PERSONA)
```

**Note:** Currently, OpenAI Assistants have instructions set at creation time, so if using enhanced caching, ensure your use case can tolerate shared base instructions with context handled elsewhere.

## Database Schema

The caching system uses the existing `OpenAiAssistantCache` table:

```sql
CREATE TABLE "OpenAiAssistantCache" (
    id SERIAL PRIMARY KEY,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "agentHash" TEXT NOT NULL UNIQUE,  -- Cache key (hash of configuration)
    "assistantId" TEXT NOT NULL        -- OpenAI Assistant ID
);
```

## Benefits

1. **DRY Principle**: Eliminates code duplication across the codebase
2. **Maintainability**: Centralized logic makes updates and bug fixes easier
3. **Extensibility**: Easy to add new configuration parameters (model, temperature, tools)
4. **Flexibility**: Support for multiple caching strategies
5. **Performance**: Better resource efficiency through intelligent assistant reuse
6. **Observability**: Detailed logging for monitoring and debugging

## Future Enhancements

The system is designed to be extensible. Future improvements could include:

1. **Model selection**: Include model name in cache key when supported
2. **Temperature settings**: Include temperature in cache key when configurable
3. **Tools configuration**: Include tools in cache key when dynamically configured
4. **TTL-based expiration**: Automatically invalidate old assistants
5. **Usage analytics**: Track cache hit rates and assistant reuse statistics
6. **Smart invalidation**: Detect when agent source changes require cache invalidation

## Migration Notes

The new implementation is **backward compatible** by default. Existing code will continue to work with the same behavior as before (strict caching with CONTEXT included).

To adopt enhanced caching for better resource reuse:

```typescript
// Change from:
{ includeDynamicContext: true }

// To:
{ includeDynamicContext: false }
```

## Testing Recommendations

When testing the enhanced caching system:

1. **Cache Hits**: Create two agents with the same base configuration
2. **Cache Misses**: Create agents with different base configurations
3. **Dynamic Context**: Test with different CONTEXT lines in both modes
4. **Invalidation**: Test cache clearing and recreation
5. **Concurrent Requests**: Test multiple simultaneous requests for the same agent
6. **Error Handling**: Test behavior when assistant creation fails

## Performance Considerations

- **Cache Lookups**: Single database query per chat request
- **Assistant Creation**: Only on cache miss (saved API call to OpenAI)
- **Memory Usage**: Minimal - only stores assistant IDs and metadata
- **Database Size**: One row per unique assistant configuration

## Logging

The system provides detailed logging when `isVerbose: true`:

```
[AssistantCacheManager] Looking up assistant for agent "MyAgent" (cache key: abc123...)
[AssistantCacheManager] ✓ Cache HIT for agent "MyAgent" - reusing assistant asst_xyz789
```

Or:

```
[AssistantCacheManager] Looking up assistant for agent "MyAgent" (cache key: abc123...)
[AssistantCacheManager] ✗ Cache MISS for agent "MyAgent" - creating new assistant
[AssistantCacheManager] ✓ Created and cached new assistant asst_xyz789 for agent "MyAgent"
```

This makes it easy to monitor cache effectiveness and debug issues.

## Conclusion

The enhanced assistant caching system provides a robust, maintainable, and extensible foundation for managing OpenAI Assistants in the Agents Server. It follows software engineering best practices (DRY, separation of concerns, extensibility) while maintaining backward compatibility and improving resource efficiency.
