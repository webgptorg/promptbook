# OpenAI AgentKit Migration Plan

Note: Created by [`[✨🎩]` this prompt](prompts/2026-01-1000-migrate-to-agent-kit.md), !!!!!! remove after migration is finished

## Overview

This document outlines the migration from OpenAI Assistants API to OpenAI AgentKit for the Promptbook Agent system.

## ⚠️ **ACTION REQUIRED BY YOU**

Before implementation can proceed, **you need to provide** the following information about OpenAI AgentKit:

### 1. AgentKit API Documentation

-   [ ] Provide link or documentation for OpenAI AgentKit API
-   [ ] Confirm the API namespace (e.g., `client.agentKit.*` or `client.beta.agents.*`)
-   [ ] Share code examples of creating an agent with AgentKit

### 2. Key API Methods

Please confirm or provide the correct method signatures for:

#### Creating an Agent

```typescript
// Assistants API (old):
const assistant = await client.beta.assistants.create({
    name: string,
    instructions: string,
    model: string,
    tools: [...],
    tool_resources: { file_search: { vector_store_ids: [...] } }
});

// AgentKit (new) - PLEASE PROVIDE:
const agent = await client.???({
    // What parameters?
});
```

#### Running an Agent

```typescript
// Assistants API (old):
const stream = await client.beta.threads.createAndRunStream({
    assistant_id: string,
    thread: { messages: [...] }
});

// AgentKit (new) - PLEASE PROVIDE:
const stream = await client.???({
    // What parameters?
});
```

#### Vector Store Management

-   [ ] Are vector stores created the same way?
-   [ ] How are they attached to agents in AgentKit?
-   [ ] Is the polling mechanism the same?

### 3. Model Information

-   [ ] Confirm `gpt-5.2` is the correct model name
-   [ ] Are there other model variants for AgentKit (e.g., `gpt-5.2-turbo`)?

### 4. Tool Calling

-   [ ] Does AgentKit support the same tool format as Assistants?
-   [ ] Any changes to the tool execution flow?
-   [ ] Are streaming and non-streaming modes both supported?

---

## Implementation Plan (Pending Your Input)

Once you provide the above information, here's what will be implemented:

### Phase 1: Base Infrastructure (DRY Principle)

1. **Create `OpenAiVectorStoreHandler` base class**

    - Extract all vector store logic from `OpenAiAssistantExecutionTools`
    - Methods:
        - `createVectorStoreWithKnowledgeSources()`
        - `uploadKnowledgeSourceFilesToVectorStore()`
        - `downloadKnowledgeSourceFile()`
        - `logVectorStoreFileBatchDiagnostics()`
    - Both old and new tools will extend this

2. **Refactor `OpenAiAssistantExecutionTools`**
    - Extend `OpenAiVectorStoreHandler`
    - Mark as `@deprecated`
    - Add deprecation JSDoc comments
    - Remove vector store code (use inherited methods)

### Phase 2: AgentKit Implementation

3. **Create `OpenAiAgentKitExecutionTools`**

    - Extend `OpenAiVectorStoreHandler`
    - Implement AgentKit-specific API calls
    - Use `gpt-5.2` as default model
    - Support streaming with `callChatModelStream()`
    - Support tool calling
    - Maintain same interface as Assistants tools

4. **Create `OpenAiAgentKitExecutionToolsOptions`**

    - Similar to `OpenAiAssistantExecutionToolsOptions`
    - Replace `assistantId` with `agentKitAgentId`
    - Keep all other options compatible

5. **Create `createOpenAiAgentKitExecutionTools` factory function**
    - Mirror pattern from `createOpenAiAssistantExecutionTools`

### Phase 3: Integration

6. **Update `AgentLlmExecutionTools`**

    - Add type guard: `OpenAiAgentKitExecutionTools.isOpenAiAgentKitExecutionTools()`
    - Update logic to prefer AgentKit over Assistants
    - Keep backward compatibility with Assistants

7. **Update caching system**

    - Modify `AssistantCacheManager` or create `AgentKitCacheManager`
    - Database `preparedExternals` JSON schema:

        ```typescript
        {
          // Old (deprecated, keep for backward compat)
          openaiAssistantId?: string;
          openaiAssistantHash?: string;

          // New (preferred)
          openaiAgentKitAgentId?: string;
          openaiAgentKitAgentHash?: string;
        }
        ```

    - Update cache key computation
    - Migration path: If old assistant exists, continue using it; new agents use AgentKit

8. **Update Agents Server**
    - Create `$provideOpenAiAgentKitExecutionToolsForServer.ts`
    - Update relevant API endpoints to use AgentKit
    - Keep Assistants as fallback for existing agents

### Phase 4: Developer Experience

9. **Update playgrounds**

    - `src/llm-providers/agent/playground/playground.ts`: Use AgentKit
    - `src/llm-providers/openai/playground/playground.ts`: Add AgentKit sample

10. **Add logging with `[🤰]` tags**

    - Mirror logging pattern from Assistants
    - Log agent creation, vector store upload, etc.

11. **Update documentation**
    - Add migration notes to `/changelog/_current-preversion.md`
    - Update any relevant README files
    - Add JSDoc examples

### Phase 5: Testing

12. **Verify all features**
    -   [ ] KNOWLEDGE commitment works
    -   [ ] Tool calling works
    -   [ ] Streaming works
    -   [ ] Caching works (agents reused across requests)
    -   [ ] Vector store attachment works
    -   [ ] Self-learning works
    -   [ ] Teacher agents work
    -   [ ] Agents Server integration works

---

## File Structure (To Be Created)

```
src/llm-providers/openai/
├── OpenAiVectorStoreHandler.ts              # NEW - Base class for vector stores
├── OpenAiAgentKitExecutionTools.ts          # NEW - AgentKit implementation
├── OpenAiAgentKitExecutionToolsOptions.ts   # NEW - Options interface
├── createOpenAiAgentKitExecutionTools.ts    # NEW - Factory function
├── OpenAiAssistantExecutionTools.ts         # MODIFY - Add @deprecated, extend base
└── utils/
    └── (shared vector store utilities)

apps/agents-server/src/tools/
├── $provideOpenAiAgentKitExecutionToolsForServer.ts  # NEW - Server provider

src/llm-providers/agent/
├── AgentLlmExecutionTools.ts                # MODIFY - Support AgentKit
├── playground/playground.ts                  # MODIFY - Use AgentKit
```

---

## Database Migration

No schema changes required! The `preparedExternals` column is already JSON, so we can add new fields:

```sql
-- Example of how data will look:
UPDATE "Agent"
SET "preparedExternals" = jsonb_set(
    COALESCE("preparedExternals", '{}'::jsonb),
    '{openaiAgentKitAgentId}',
    '"agnt_abc123"'
);
```

The migration will be seamless - old agents keep their `openaiAssistantId`, new agents get `openaiAgentKitAgentId`.

---

## Backward Compatibility Strategy

1. **Keep Assistants API functional**

    - `OpenAiAssistantExecutionTools` remains usable (just deprecated)
    - Existing agents with cached assistant IDs continue working

2. **Gradual migration**

    - New agents automatically use AgentKit
    - Existing agents can be manually migrated by clearing cache
    - No breaking changes to public API

3. **Type guards**
    - Code can check: `if (isAssistant) { ... } else if (isAgentKit) { ... }`

---

## Next Steps

1. **YOU**: Please provide the AgentKit API documentation above
2. **ME**: I'll implement the migration based on your specifications
3. **YOU**: Test with your OpenAI API key
4. **ME**: Address any issues found during testing

---

## Questions?

If you have the AgentKit documentation or can access https://platform.openai.com/docs/guides/agents#agentkit, please share:

-   API method names
-   Parameter structures
-   Code examples
-   Any migration guides from OpenAI

This will ensure the implementation matches the actual AgentKit API.
