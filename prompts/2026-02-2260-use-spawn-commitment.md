[x] ~$1.24 an hour by OpenAI Codex `gpt-5.3-codex`

[✨🥂] USE SPAWN commitment (tool) to create an Agents Server Agent from given source

-   Add a new commitment named `USE SPAWN` that exposes a tool the LLM can call to create a new **persistent** Agents Server `Agent` entity (child agent) and provide the agent `source` (promptbook source / markdown / yaml / etc.) directly in the tool input.
-   The spawned agent must behave exactly the same as if it was created manually in the Agents Server UI/API.
-   The tool input must support **exactly the same options as manual agent creation** (mirror the Agents Server create-agent DTO/schema):
    -   At minimum include `source` plus all other agent creation fields (e.g. `name`, `description`, `model`/`provider`, `isPublic`/visibility, `knowledge`, `avatar`/image settings, `memory` settings, `tags`, etc. — whatever exists today).
    -   If there is a single existing server-side type for create-agent input, reuse it end-to-end (do not duplicate types).
    -   Validate and reject unknown fields to avoid silent misconfiguration.
-   Contract of the tool call:
    -   It receives `source` and other agent-create fields from the tool call.
    -   It creates the agent as persisted entity via the same code-path as manual creation.
    -   It returns a structured result with at least: `agentId`, `status`, and `agent` (or `error`).
    -   Optionally support `run: { task, inputs, ... }` to immediately start a first run/chat after creation (only if this exists for manual creation today; otherwise keep it out).
-   Security + limits (safe-by-default):
    -   Enforce size limits on `source` and any large text fields.
    -   Ensure the caller has permission to create agents (respect authn/authz and quotas).
    -   Prevent infinite spawn loops / abuse (recursion depth, max spawned agents per parent run/user/time window — pick what fits existing platform limits).
    -   Consider rate limiting and audit logging for spawning.
-   Make the commitment usable in both:
    -   Promptbook runtime (commitments + LLM tool calling)
    -   Agents Server (actual persistence + API route)
-   Implementation notes / project areas:
    -   You are working with:
        -   [commitments](src/commitments)
        -   [llm provider agent runtime](src/llm-providers/agent)
        -   [Agents Server tools + routing](apps/agents-server/src/tools)
        -   [Agents Server API routes](apps/agents-server/src/app/api)
        -   Agents Server agent creation logic (reuse the same function used by the UI/API)
-   Provide examples and tests:
    -   Add at least one example promptbook showing `USE SPAWN` creating an agent from inline source.
    -   Add unit/integration test(s) covering:
        -   successful creation
        -   validation errors (missing required fields, unknown fields)
        -   permission/quota failures
        -   payload too large
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

---

[-]

[✨🥂] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)