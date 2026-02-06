[x] ~$0.00 by OpenAI Codex `gpt-5.2-codex` _(failed attempt)_

---

[x] ~$0.00 by OpenAI Codex `gpt-5.2-codex`

[✨🎩] Migrate Promptbook Agents from Assistants API to OpenAI AgentKit

-   You are migrating [`Agent` class](src/llm-providers/agent/Agent.ts)
-   Migrate `Agent` class and all related classes from using OpenAI Assistants API to [OpenAI AgentKit](https://platform.openai.com/docs/guides/agents#agentkit), the migration guide is placed below.
-   You are doing refactoring migration. Do not change features; just migrate them, keep in mind:
    -   `KNOWLEDGE` should work as before
    -   Tool calling should work as before, for example commitments `USE TIME` or `USE SEARCH ENGINE` should work as before, just use AgentKit instead of Assistants API under the hood
    -   Streaming of responses should work as before _(token by token in the chat of the Agents server)_
    -   Caching of the agents and underlying assistants should work as before _(in table `Agent` column `preparedExternals`)_
-   Use `gpt-5.2` model as the base model for the agents in the Agent based on Agent kit
-   Use `OpenAiAgentKitExecutionTools` as the new class name used internally in `Agent` instead of `OpenAiAssistantExecutionTools`.
-   Migrate [Agents server `$provideOpenAiAgentKitExecutionToolsForServer`](apps/agents-server/src/tools/$provideOpenAiAgentKitExecutionToolsForServer.ts) to the new `OpenAiAgentKitExecutionTools`.
-   Migrate the [`Agent` playground](src/llm-providers/agent/playground/playground.ts)
-   Add sample to [Open AI playground](src/llm-providers/openai/playground/playground.ts)
-   Keep the manipulation of vector stores as before, just use AgentKit instead of Assistants API.
-   Keep `OpenAiAssistantExecutionTools`, just mark it as deprecated and do not use in `Agent`.
-   Do not confuse the Promptbook native `Agent`, `RemoteAgent` and the "agent" from OpenAI AgentKit - Everything from OpenAI AgentKit should be named `OpenAiAgentKitAgent...` to avoid confusion.
    -   Theese are two different concepts - the Promptbook "Agent" is a class and concept that represents an agent in Promptbook, while the OpenAI AgentKit "agent" is a specific implementation of an AI agent provided by OpenAI which will be used internally by the Promptbook `Agent` class.
    -   Write `import { Agent as AgentFromKit } from '@openai/agents';` to avoid confusion between the two concepts in the codebase.
    -   There is also (Promptbook) Agent server on `apps/agents-server` where the Promptbook Agents live
-   Mark the preparation steps of the agent kit with `[🤰]` tag in the logs, look how it is done in `src/llm-providers/openai/OpenAiAssistantExecutionTools.ts`
-   One promptbook `Agent` should use one OpenAI AgentKit agent with attached vector store under the hood, similar to how it was with Assistants API.
-   Keep the naming strategy of the agents the same, for example "my-chatbot - fc201453"
-   Keep the caching of the agents and underlying assistants the same as before, use table `Agent` column `preparedExternals`
    -   Just instead of `openaiAssistantId` -> use `openaiAgentKitAgentId` and instead of `openaiAssistantHash` -> use `openaiAgentKitAgentHash`
    -   BUT Maybe `openaiAgentKitAgentId` and `openaiAgentKitAgentHash` arent needed, maybe cache just the vector stores
    -   There should be some caching on some level, either on the level of the AgentKit agent or on the level of the vector store, to ensure that we are not creating new AgentKit agents and vector stores on every request, but reuse them across requests, similar to how it was with Assistants API.
-   Vector stores are created in the same way. Just create some common abstraction and share the code between `OpenAiAssistantExecutionTools` and `OpenAiAgentKitExecutionTools` for vector store handling, create the `OpenAiVectorStoreHandler` base class in `src/llm-providers/openai/OpenAiVectorStoreHandler.ts` and move the common code there.
-   Keep in mind the DRY _(don't repeat yourself)_ principle, just dont intermingle the code of the new and deprecated stuff.
    -   Maybe create some base classes to share the code between `OpenAiAssistantExecutionTools` and `OpenAiAgentKitExecutionTools`, especially for vector store handling.
-   Add the changes into the `/changelog/_current-preversion.md`
-   If there is something that I need to do, write me a detailed plan of what needs to be done and save it into the file in the root of the repository.

![alt text](prompts/screenshots/2026-01-0463-agents-server-agents-taking-sooooooo-long-to-prepare-and-answer.png)

**Here is the sample how Agent from AgentKit works:**

_(You will be just creating the vector store dynamically, same as in Assistants API.)_

```typescript
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import {
    Agent as AgentFromKit,
    fileSearchTool,
    run,
    setDefaultOpenAIClient,
    setDefaultOpenAIKey,
} from '@openai/agents';
import colors from 'colors';
import OpenAI from 'openai';
import { join } from 'path';
import { TODO_any } from '../_packages/types.index';

const VECTOR_STORE_ID = 'vs_6985a2d7cc348191b145accb64de533f';
const USER_PROMPT = 'Jaké je číslo na Technika požární ochrany?';

if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY env var.');
}

// Official OpenAI SDK client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Wire the official OpenAI client into the Agents SDK (AgentKit runtime)
setDefaultOpenAIKey(process.env.OPENAI_API_KEY);
setDefaultOpenAIClient(openai as TODO_any); // typings may differ across versions

// AgentKit agent (in-code) + attach Vector Store via hosted file_search tool
const agent = new AgentFromKit({
    name: 'Praha13 Knowledge Agent',
    model: 'gpt-5.2',
    instructions:
        'Odpovídej česky. Používej file_search k vyhledání odpovědi v knowledge base. Když to v datech není, řekni že to nevíš.',
    tools: [fileSearchTool(VECTOR_STORE_ID)],
});

// Run the agent once (no server, just a script)
const result = await run(agent, USER_PROMPT);

console.log('\n=== AGENT RESPONSE ===\n');
console.log(result.finalOutput || '(No output)');
```

---

[-]

[✨🎩] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨🎩] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨🎩] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

```

```

