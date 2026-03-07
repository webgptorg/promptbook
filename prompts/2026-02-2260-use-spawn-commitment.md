[ ]

[✨🥂] USE SPAWN commitment (tool) to create a child agent from given source

-   Add a new commitment named `USE SPAWN` that exposes a tool the LLM can call to spawn another agent (child agent) and provide the agent source (promptbook source / markdown / yaml / etc.) directly in the tool input.
-   The spawned agent must be created with a clear contract:
    -   It receives its `source` from the tool call.
    -   It runs in isolation from the parent agent (separate run context, tools, memory) except for the minimal explicitly passed inputs.
    -   Parent gets back a structured result (at least `agentId`, `status`, and `result`/`output` or `error`).
-   Support passing additional optional parameters in the tool input:
    -   `name` (human readable name)
    -   `goal`/`task` (the immediate instruction for the spawned agent)
    -   `inputs` (JSON object passed to the spawned agent)
    -   `capabilities`/`tools` allowlist (if the platform supports restricting tools)
    -   `timeoutMs` and `maxSteps` (or the closest existing limits)
-   Ensure the tool is safe-by-default:
    -   Define and enforce defaults for timeouts/limits.
    -   Prevent infinite spawn loops (detect recursion depth, max children per run, etc.).
    -   Validate and size-limit `source`.
-   Make the commitment usable both in Promptbook runtime and in Agents Server (if applicable):
    -   Add any necessary API endpoint(s) for spawning agent runs.
    -   Ensure it works in streaming and non-streaming modes.
-   Provide examples and tests:
    -   Add at least one example usage in docs or in an existing example prompt.
    -   Add unit/integration test(s) covering success and failure scenarios.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with:
    -   [commitments](src/commitments)
    -   [llm provider agent runtime](src/llm-providers/agent)
    -   [Agents Server tools + routing](apps/agents-server/src/tools)
    -   [Agents Server API routes](apps/agents-server/src/app/api)
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨🥂] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨🥂] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨🥂] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)