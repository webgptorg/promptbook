[x]

[✨🌮] Create `AgentLlmExecutionTools`

-   `AgentLlmExecutionTools implements LlmExecutionTools`
-   Theese LLM tools can are behaving like a chat model provider but with predefined "soul" of the agent
-   This will revieve underlying `LlmExecutionTools` and `agentSource: string_book`
-   It has only `callChatModel` method (not `callCompletionModel` or `callEmbeddingModel` method)
-   On the background it will call the underlying `LlmExecutionTools.callChatModel` method
-   But it will pass the system prompt and other model requirements which will be generated from the `agentSource` using the `createAgentModelRequirements` function
-   The generated model requirements should be internally cached for the `AgentLlmExecutionTools` - Each instance of `AgentLlmExecutionTools` will has its own one `agentSource`
-   The `AgentLlmExecutionTools.title`, `AgentLlmExecutionTools.description` and `AgentLlmExecutionTools.profile` will be generated from the `agentSource` using the `parseAgentSource` function
-   This is `LlmExecutionTools` conceptually between standalone model provider like `OpenAiExecutionTools` and tool to wrap other tools like `CacheLlmToolsOptions`
-   Look how other `LlmExecutionTools` are implemented and create everything needed
    -   Create folder with everything in `/src/llm-providers`
    -   Create both `AgentLlmExecutionTools` and `createAgentLlmExecutionTools`
    -   Do not create separate package export the `AgentLlmExecutionTools` from `@promptbook/core`
    -   Create a playground and put it into [terminals.json](/.vscode/terminals.json)
    -   The playground should demonstrate the usage of `AgentLlmExecutionTools` in a chat scenario with some simple agent source
    -   Do not create `agent-models.ts` - it does not make sence
    -   Register this "model provider" into `$llmToolsMetadataRegister` and `$llmToolsRegister` both registrations should be exported from `@promptbook/core`
        => This model provider will be available with the Promptbook engine by default without any extra installation or inclusion
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨🌮] In `AgentLlmExecutionTools` pick the best model from available models

-   The mechanism of picking the best model should be in the `createAgentModelRequirements` function
-   The `createAgentModelRequirements` function should has optionally parameter `availableModels: AvailableModel[]` - the list of available models from the underlying
-   Keep in mind the DRY _(don't repeat yourself)_ principle - the mechanism of picking the best model is already implemented in the [`preparePersona`](/src/personas/preparePersona.ts) function - use it internally in the `createAgentModelRequirements` function when the `availableModels` parameter is passed

---

[ ]

[✨🌮] quux

---

[ ]

[✨🌮] quux
