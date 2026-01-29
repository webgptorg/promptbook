# Vector Store Caching in Agents Server

## Overview

This document describes the caching mechanism for OpenAI Responses vector stores created for agents on the Agents Server. The implementation improves resource efficiency by allowing agents with the same configuration to share a cached vector store for file search.

## Problem Statement

With the move to the Responses API, agents no longer rely on persistent Assistants. The expensive resource to reuse is the vector store used by file search. Without caching, vector stores would be created repeatedly for agents with identical knowledge sources.

## Solution

A centralized vector store caching system provides:

- Cache lookup for existing vector stores
- Creation of new vector stores on cache miss
- Storage of cache metadata in the database
- Clear logging for cache hits and misses

### 1. AgentVectorStoreCacheManager (`src/utils/cache/AgentVectorStoreCacheManager.ts`)

A class that manages the vector store cache lifecycle.

Example usage:

```typescript
const vectorStoreCacheManager = new AgentVectorStoreCacheManager({ isVerbose: true });
const vectorStoreResult = await vectorStoreCacheManager.getOrCreateVectorStore(
    agentSource,
    agentName,
    baseOpenAiTools,
    { includeDynamicContext: true }
);
```

### 2. Cache Key Computation (`src/utils/cache/computeAgentCacheKey.ts`)

Utilities for computing cache keys based on agent configuration:

- `extractAgentCacheConfiguration(agentSource, options)`
- `computeAgentCacheKey(configuration)`

The cache key includes:

- Agent name
- Instructions (PERSONA + optional CONTEXT)
- Base agent source (captures commitments like KNOWLEDGE, RULE, etc.)

### 3. Integration in `handleChatCompletion`

`handleChatCompletion` uses the cache manager to resolve a vector store ID before constructing the agent.

```typescript
const vectorStoreResult = await vectorStoreCacheManager.getOrCreateVectorStore(
    agentSource,
    agentName,
    baseOpenAiTools,
    { includeDynamicContext: true }
);

const openAiAgentExecutionTools = vectorStoreResult.vectorStoreId
    ? baseOpenAiTools.withVectorStoreId(vectorStoreResult.vectorStoreId)
    : baseOpenAiTools;
```

## Caching Modes

The system supports two caching modes:

1. Strict caching (default): `{ includeDynamicContext: true }`
   - CONTEXT lines are included in the cache key.

2. Enhanced caching: `{ includeDynamicContext: false }`
   - CONTEXT lines are excluded from the cache key for better reuse.

## Database Schema

The cache uses the existing `OpenAiAssistantCache` table (legacy name):

```sql
CREATE TABLE "OpenAiAssistantCache" (
    id SERIAL PRIMARY KEY,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "agentHash" TEXT NOT NULL UNIQUE,
    "assistantId" TEXT NOT NULL
);
```

The `assistantId` column stores the vector store ID.

## Logging

Example log output:

```
[AgentVectorStoreCacheManager] Looking up vector store for agent "MyAgent" (cache key: abc123...)
[AgentVectorStoreCacheManager] Cache HIT for agent "MyAgent" - reusing vector store vs_xyz789
```

## Conclusion

The vector store cache keeps Responses-based agents efficient while preserving the existing cache key strategy. It is designed to be extended with additional cache dimensions as more Responses features are adopted.
