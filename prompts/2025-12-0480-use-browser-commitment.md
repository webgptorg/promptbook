[x]

[✨🤸] Implement `USE BROWSER` commitment

```book
Paul Smith & Associés

PERSONA You are a company lawyer.
Your job is to provide legal advice and support to the company and its employees.
You are knowledgeable, professional, and detail-oriented.
USE BROWSER
```

-   `USE BROWSER` indicates that the agent should utilize a web browser tool to access and retrieve up-to-date information from the internet when necessary.
-   The contents of this commitment _(what follows after "USE BROWSER", like "USE BROWSER contents foo bar ...")_ has no effect and is ignored _(simmilar to `NOTE`)_
-   This is the first commitment in family of commitments `USE`, there will be more in future, e.g., `USE SEARCH ENGINE`, `USE FILE SYSTEM`, `USE MCP`, etc. _(Its simmilar principle to `META IMAGE`, `META LINK`, `META COLOR`,... commitment family, look how they are handled)_
-   For the commitment `USE BROWSER` create its folder in `/src/commitments` and register it in the `/src/commitments/index.ts`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   To implement the actual browser use You are working with the `Agents Server` application `/apps/agents-server`
-   Add the changes into the `/changelog/_current-preversion.md`

```markdown
I have a plan to implement the browser usage for agents.

1. **Update `src/commitments/USE_BROWSER/USE_BROWSER.ts`**:

    - Modify `applyToAgentModelRequirements` to:

        - Mark `metadata.useBrowser = true`.
        - Inject detailed instructions into `systemMessage` about how to use the browser (JSON protocol), derived from the sample in `apps/agents-server/src/app/api/browser-test/act/route.ts`.
        - Include any content following `USE BROWSER` as context/instructions for the agent.

2. **Create `apps/agents-server/src/tools/BrowserExecutionTools.ts`**:

    - Implement a class that implements `LlmExecutionTools`.

    - It will wrap an underlying `LlmExecutionTools` instance.

    - In `callChatModelStream`, it will:

        - Call the underlying tools.
        - Check if the response contains browser action JSON.
        - If yes, execute the actions using `$provideBrowserForServer`.
        - Feed the execution results back to the underlying LLM (recursion/loop) until a final answer is reached or a limit is hit.
        - Stream progress updates.

3. **Update `apps/agents-server/src/utils/handleChatCompletion.ts`**:

    - Detect if the agent source contains `USE BROWSER` (using regex or parsing).
    - If detected, wrap the `openAiAssistantExecutionTools` with `BrowserExecutionTools`.
    - Pass this wrapped toolset to the `Agent` constructor.

4. **Update `changelog/_current-preversion.md`**:

    - Add an entry about the new feature.

This approach respects the existing architecture where `Agent` wraps execution tools, and allows us to inject the browser capability via a specialized execution tool wrapper that handles the tool use loop. It also follows the DRY principle by reusing the browser provision logic and the commitment system.
```

---

[x]

[✨🤸] Implement the browser usage for agents on agents server

-   There is already commitment `USE BROWSER` in the agent server

```book
Kosmas


PERSONA Jsi historik specializující se na středověké dějiny českých zemí.
USE BROWSER https://cs.wikipedia.org/wiki/P%C5%99emyslovci
```

-   The bowser commitment `USE BROWSER` allows the agent to use browser automation
-   The content after `USE BROWSER` is arbitrary text that agent should know:
    -   `USE BROWSER https://cs.wikipedia.org/wiki/P%C5%99emyslovci` means the agent should use the browser to visit the page `https://cs.wikipedia.org/wiki/P%C5%99emyslovci` and get information from there
    -   `USE BROWSER find latest news about AI` means the agent should use the browser to search for latest news about AI
-   On page `/admin/browser-test` there is a sample how to use browser automation in agent server, take the logic and reference how to integrate a browser from there
    -   Use function `$provideBrowserForServer` to get browser instance,
-   The `USE BROWSER` should work in the `Agents Server` application `/apps/agents-server`
-   [Commitments](/src/commitments) are syntax snippets that add specific functionalities to AI agents, they are used in `agentSource`, there are commitments like `PERSONA`, `RULE`, `KNOWLEDGE`, `USE BROWSER`, etc.
-   Add the changes into the `/changelog/_current-preversion.md`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🤸] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🤸] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`
