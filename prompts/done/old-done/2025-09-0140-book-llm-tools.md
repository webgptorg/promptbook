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

[x]

[✨🌮] In `AgentLlmExecutionTools` pick the best model from available models

-   The mechanism of picking the best model should be in the `createAgentModelRequirements` function
-   The `createAgentModelRequirements` function should has optionally parameter `availableModels: AvailableModel[]` - the list of available models from the underlying
-   Keep in mind the DRY _(don't repeat yourself)_ principle - the mechanism of picking the best model is already implemented in the [`preparePersona`](/src/personas/preparePersona.ts) function - use it internally in the `createAgentModelRequirements` function when the `availableModels` parameter is passed

---

[x]

[✨🌮] In src/book-2.0/agent-source/createAgentModelRequirements.ts shouldnt be `selectBestModelFromAvailable`, it should use directly [`preparePersona`](/src/personas/preparePersona.ts) function

This is mechanism for picking the best model from available models when I know all the available models and the requirements of the agent.

---

[.] <- Note: Implementing differently

[✨🌮] Fix **OpenAI** thrown **Error:** 400 Unsupported value: 'temperature' does not support 0.7 with this model. Only the default (1) value is supported.

-   `AvailableModel` interface should have `unsupportedModelRequirements?: Partial<Array<keyof ModelRequirements>>` property
-   In `OpenAiExecutionTools` in dynamically remove unsupported model requirements before calling the OpenAI API
-   Do some common utility function to remove unsupported model requirements which will be later used in other model providers
-   List theese unsupported model requirements for each model in the `openai-models.ts` file

---

[x]

[✨🌮] Fix **OpenAI** thrown **Error:** 400 Unsupported value: 'temperature' does not support 0.7 with this model. Only the default (1) value is supported.

-   In `OpenAiCompatibleExecutionTools` should detect the "Unsupported value" error and remove unsupported model requirements and retry the request once again
-   The error should be just logged as a warning when the tools are in `isVerbose` mode
-   When the same error happens again, the error should be thrown as usual
-   This should be implemented only for `OpenAiCompatibleExecutionTools`

---

[ ]

[✨🌮] quux

---

[ ]

[✨🌮] quux

---

[ ]

[✨🌮] quux

---

[ ]

[✨🌮] quux
