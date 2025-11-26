[x] _<- Done: Done in 02c69751265944e50af503d6b80cb7f88502148c_

[✨🚩] When creating new assistant in `AgentLlmExecutionTools` use `AgentModelRequirements.knowledgeSources`

```typescript
const assistant = await this.options.llmTools.createNewAssistant({
```

Each knowledge source should be used in vector store created and used for the created assistant

---

[x]

[✨🚩] Do not create new OpenAI assistant each time `AgentLlmExecutionTools.callChatModel` is called, cache and reuse the OpenAI assistants

-   One unique agent (identified by `agentname`) should have one unique OpenAI assistant created once and reused on each call to `callChatModel`
-   The first time `callChatModel` is called for the given Promptbook agent, the assistant should be created and stored in memory (in a map of `agentname` to `assistantId`)
-   On subsequent calls to `callChatModel` for the same agent, the stored assistant should be checked if its up to date with generated `agentSource` -> `modelRequirements` _(do this by some hashing mechanism, use `sha256` from `crypto-js/sha256`)_
-   Use some metadata or unique naming convention to identify the assistants created for the agents
-   If the `AgentLlmExecutionTools` are `isVerbose`, log all the operations related to creating/reusing the assistants to the console
-   This caching should be relevant same for both OpenAI Assistants itself and OpenAI file vector stores created for the assistants
-   Relevant files for this change are `/src/llm-providers/agent/AgentLlmExecutionTools.ts` and `/src/llm-providers/openai/OpenAiAssistantExecutionTools.ts` but may require changes in other files as well, feel free to refactor as needed
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨🚩] bars

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[ ]

[✨🚩] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`
