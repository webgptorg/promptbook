[x]

[✨🐚] Implement chat streaming in Agents server

-   You are working with the `Agents Server` application `/apps/agents-server`
-   You should implement streaming into `apps/agents-server/src/app/agents/[agentName]/api/chat/route.ts` and `apps/agents-server/src/app/agents/[agentName]/chat/AgentChatWrapper.tsx`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨🐚] Refactor implementation of `LlmExecutionTools.callChatModel` streaming

Current implementation:

```typescript
export type LlmExecutionTools = {
    // ...

    /**
     * Calls a chat model
     */
    callChatModel?(prompt: Prompt /* <- TODO: [🩱] ChatPrompt */): Promise<ChatPromptResult>;

    /**
     * Calls a chat model with streaming
     */
    callChatModelStream?(
        prompt: Prompt /* <- TODO: [🩱] ChatPrompt */,
        onProgress: (chunk: ChatPromptResult) => void,
    ): Promise<ChatPromptResult>;

    // ...
};
```

Target implementation:

```typescript
// @@@
```

-   It should work same as now but @@@
-   Update on all places from interface to implementations:
    -   /src/execution/LlmExecutionTools.ts
    -   /src/llm-providers/openai/OpenAiAssistantExecutionTools.ts
    -   /src/llm-providers/agent/AgentLlmExecutionTools.ts
    -   /apps/agents-server/src/app/agents/[agentName]/api/chat/route.ts
    -   /src/llm-providers/agent/RemoteAgent.ts
    -   /src/book-components/Chat/LlmChat/LlmChat.tsx
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨🐚] quux

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨🐚] quux

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
