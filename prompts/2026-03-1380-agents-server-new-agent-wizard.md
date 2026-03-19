[x] ~$0.00 an hour by OpenAI Codex `gpt-5.4`

[🧙‍♀️📋] `NEW_AGENT_WIZZARD`

Provide an alternate "New agent" creation experience to A/B test against the current book-editor-first flow. Add a metadata item as toggle that controls whether creating an agent opens the boilerplate book editor (current behavior) or a guided form-wizard that collects high-level agent details and creates the book & agent in the background.

-   `NEW_AGENT_WIZZARD` should have:

    -   `BOILERPLATE` (default): current flow, clicking "New agent" opens book editor with boilerplate source.
    -   `WIZARD`: new flow, clicking "New agent" opens a multi-step
    -   In future there will be more options, for example templates or pre-configured agents, but for this experiment we will start with a simple wizard vs boilerplate A/B test.

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

    -   Add a `NOTE` that agent was created via wizard in the book source for traceability

```book
AI Developer

NOTE This agent was created via the NEW_AGENT_WIZZARD flow
- Personality: Helpful, concise, professional
- Rules: Do not provide medical advice, do not share personal data
- Knowledge: Uploaded 3 files about cooking recipes (file1.pdf, file2.docx, file3.txt)
- Closed for self-learning

PERSONA You are a helpful, concise, and professional assistant
RULE Do not provide medical advice
RULE Do not share personal data
KNOWLEDGE file1.pdf
KNOWLEDGE file2.docx
KNOWLEDGE file3.txt
CLOSED

```

-   Frontend changes (high-level):

    -   New component: NewAgentWizard
    -   Wizzard is primarily a frontend component that will bake the agent source based on user inputs on the frontend and the backend will receive same agent source as if it came from the book editor, so we can reuse the same api endpoints.

-   You are working with the [Agents Server](apps/agents-server)

