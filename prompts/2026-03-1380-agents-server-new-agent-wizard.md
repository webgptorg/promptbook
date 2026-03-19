

[🧙‍♀️📋] NEW_AGENT_WIZZARD

-   *(@@@@ Written by agent)*

Overview: Provide an alternate "New agent" creation experience to A/B test against the current book-editor-first flow. Add a metadata toggle that controls whether creating an agent opens the boilerplate book editor (current behavior) or a guided form-wizard that collects high-level agent details and creates the book & agent in the background.

-   Why: current flow opens the book editor with boilerplate agent source which is powerful but can be intimidating. We want to test a simpler guided flow (wizard/form) that asks only for high-level choices (name, persona/traits, rules, upload knowledge, whether to open agent after creation) and creates the underlying book & agent invisibly. The end result (created agent + book) must be identical to the boilerplate flow; only the experience differs.

-   Behaviors to implement:
    -   Boilerplate mode (preserve current behavior): opening "New agent" continues to open the book editor with the boilerplate source pre-filled and allows the user to edit before saving/creating the agent.
    -   Wizard/Form mode: present a lightweight multi-step form:
        -   Step 1: Agent basic info — name (required), short description (optional), visibility (private/public/unlisted)
        -   Step 2: Persona & traits — select from ~6-10 preset trait chips (tone, domain expertise, personality snippets) and allow minimal custom trait text
        -   Step 3: Rules & guardrails — choose default safety rules toggles (e.g., no personal data retrieval, professional tone) and allow short custom instructions
        -   Step 4: Upload knowledge — upload files or paste URLs (support same knowledge ingestion pipeline as book editor). Show an optional checkbox: "Open book editor after creation"
        -   Step 5: Review & create — show selected options (no raw book content exposed), confirm creation. Creation runs in background and returns success + agent profile link.

-   UX constraints & guardrails:
    -   Do NOT expose the raw book source or editor during the wizard. Show only summarized, human-friendly labels for uploaded knowledge and selected options.
    -   Provide an explicit checkbox on whether the user wants to open the book editor after creation. Default: unchecked for wizard (to reduce friction).
    -   Keep flow compact (3–6 steps max). Allow back/forward and an explicit "advanced: open editor" link on final step.
    -   Track A/B assignment and event metrics for funnel analysis (showed wizard, completed wizard, created agent, opened editor afterwards).

-   Data & backend changes (high-level):
    -   Add a metadata record/flag for the new-agent creation experience (AgentCreationExperience or Metadata key on Team/User): enum { "boilerplate", "wizard" }. Persist per-user or per-team depending on scope (@@@ decide scope).
    -   Expose API endpoints to create an agent from the wizard payload. Endpoint should:
        -   Validate inputs (name, visibility, traits, rules)
        -   Create a Book (hidden by default) populated with the equivalent boilerplate + generated content summarizing selected traits/rules and attached knowledge files
        -   Create Agent record linking to Book and configured metadata, commit any initial AgentHistory records as current system expects (@@@ confirm AgentHistory behavior)
        -   Optionally return a pointer to open the book editor (if user chose that)
    -   Reuse existing knowledge ingestion & indexing path (the same pipeline used when saving from book editor) to ensure parity in behavior.
    -   Background job: if knowledge ingestion or book generation is expensive, perform creation asynchronously and notify user via UI (toast / agent page refresh). For MVP synchronous creation is acceptable if fast enough.

-   Frontend changes (high-level):
    -   New component: NewAgentWizard (apps/agents-server -> components/new-agent-wizard or pages/new-agent)
    -   Update NewAgent entrypoint (the button/menu that currently opens the book editor) to consult metadata and either open the book editor (boilerplate) or open the wizard modal/route (wizard)
    -   Reuse existing file upload / knowledge chips components for upload step
    -   Add simple validation and friendly error messages

-   Files / code areas to modify:
    -   apps/agents-server: new React component NewAgentWizard + route / modal
    -   apps/agents-server: NewAgent menu/button change to consult metadata and route to wizard OR book editor
    -   server API: POST /api/agents.from-wizard (or extend existing agent creation API) to accept wizard payload and create book+agent
    -   database migration: add AgentCreationExperience metadata/storage (table or user/team metadata key) — placeholder @@@
    -   background worker: reuse existing ingestion/commit flows (jobs) — placeholder @@@ if new workers needed
    -   analytics/tracking: integrate with existing tracking (events: new_agent_shown, new_agent_created, new_agent_opened_editor)
    -   tests: unit tests for the new API and component, e2e flow validating agent created equals boilerplate-created agent in functional terms (name, knowledge indexed, agent response similarity) — placeholders for exact test cases @@@

-   Acceptance criteria:
    -   Users with metadata=boilerplate see the current book-editor-first flow unchanged.
    -   Users with metadata=wizard see the new multi-step wizard and can complete creation without seeing raw book content.
    -   Agent and Book records created by wizard are functionally equivalent to agents created by the boilerplate flow (same fields, same knowledge ingestion pipeline used).
    -   Telemetry events emitted for A/B analysis; we can compute conversion rates (wizard shown -> created) vs boilerplate flow.
    -   No sensitive/book internal content is exposed in the wizard UI.

-   Rollout & A/B testing plan:
    -   Implement metadata as per-user flag defaulting to "boilerplate". Provide server-side toggle to flip cohorts for experiments.
    -   Gradually roll wizard to small % of users (e.g., 10%), measure funnel metrics, iterate on UX

-   Open questions / placeholders:
    -   Scope of metadata: per-user or per-team? @@@
    -   How to ensure generated book content parity with current boilerplate template (exact template copy or a generator)? @@@
    -   Should the wizard create the Book synchronously or schedule a background job? (MVP: synchronous if fast) @@@
    -   Exact DB schema for metadata / migrations (placeholder) @@@
    -   Edge cases: very large knowledge uploads, and virus scanning / file size limits (need to confirm existing constraints) @@@

-   QA checklist:
    -   Manual test: create agent via wizard with uploaded files and verify agent responds and knowledge is indexed
    -   Automated: unit tests for API, integration test for end-to-end create + index
    -   Security: confirm uploads pass existing virus-scan / validation pipeline


This commit was done by [Promptbook Agent](https://pavol-hejny.ptbk.io/agents/E1upys74QBME7s/)
