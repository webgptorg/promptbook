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
        -   Step 1: Agent basic info - name (required), short description (optional), visibility (private/public/unlisted)
        -   Step 2: Persona & traits - select from ~6-10 preset trait chips (tone, domain expertise, personality snippets) and allow minimal custom trait text
        -   Step 3: Rules & guardrails - choose default safety rules toggles (e.g., no personal data retrieval, professional tone) and allow short custom instructions
        -   Step 4: Upload knowledge - upload files or paste URLs (support same knowledge ingestion pipeline as book editor). Show an optional checkbox: "Open book editor after creation"
        -   Step 5: Review & create - show selected options (no raw book content exposed), confirm creation. Creation runs in background and returns success + agent profile link.

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

---

[x] ~$0.00 26 minutes by OpenAI Codex `gpt-5.3-codex`

[🧙‍♀️📋] Enhance the new agent wizzard

0. **All pages**

-   Make the wizard much more lightweight and visually easier. There is now so much clutter, and it looks like some corporate form which shouldn't be.
-   You should be able to jump across any step you want. It shouldn't be blocked by unfilled things. You should be able to click on any step and be navigated to this step.

![Step 1](prompts/screenshots/2026-03-1380-agents-server-new-agent-wizard.png)

1. **Step 1: Basics**

-   Pre-fill the agent name with some boilerplate name. Use the existing mechanism for creating boilerplate names.

![Step 1](prompts/screenshots/2026-03-1380-agents-server-new-agent-wizard.png)

2. **Step 2: Persona & traits**

-   Custom trait should work like adding new chips, press enter to add a new trait.
-   Also allow to select the `USE`capabilities, like `USE BROWSER` or `USE SEARCH ENGINE`, But in this step, do not expose the detail that these are in the book language, something different than `PERSONA`. Here, they should be shown just as the traits.
-   For example, if the user selects `USE BROWSER` capability, we can show a trait chip with "Can use browser" or something like this, without exposing the underlying book commitment. We want to keep it simple and not expose any book language or technical details in the wizard, just human-friendly labels for traits and capabilities.

![Step 2](prompts/screenshots/2026-03-1380-agents-server-new-agent-wizard-1.png)

3. **Step 3: Rules & guardrails**

-   Rules should be added in the same way as traits, press enter to add a new rule.

![Step 3](prompts/screenshots/2026-03-1380-agents-server-new-agent-wizard-2.png)

4. **Step 4: Knowledge**

-   Entire model should be file drag and drop active
-   Adding URL knowledge should work same as traits and rules, you should be able to paste \*/ write URL and press enter to add it to the list of knowledge.
-   Remove "Open book editor after creation", this shouldn’t be a thing

![Step 4](prompts/screenshots/2026-03-1380-agents-server-new-agent-wizard-3.png)

5. **Step 5: Review**

-   Remove this step entirely and replace, just allow to create the agent after step 4, there is no need for review, it is just a summary of previous steps and it doesn't add much value, we can save users time by removing it.

**Common rules:**

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Do a proper analysis of the book language before you start implementing
-   You are working with the [Agents Server](apps/agents-server)

---

[x] ~$0.00 36 minutes by OpenAI Codex `gpt-5.4`

[🧙‍♀️📋] Enhance the new agent wizzard

-   In Page 1 - Allow to specify `GOAL`
-   In Page 2 - Persona, list all the capabilities, look on all `USE` commitments and also allow to check `Open to learning` which adds `OPEN` / `CLOSED` commitment, also each persona trait preset should have icon, also list more persona presets
-   Add here Page 3 - The writing style, with presets like "Professional", "Friendly", "Concise", "Detailed", etc. Each preset should have an icon, and also allow to write custom writing style trait. This will set commitments `WRITING RULES` and `WRITING STYLE` in the book source, but in the wizard, we should not expose these technical details, just show it as traits or capabilities and allow to add custom writing style rule and sampling. Show the samplings in message bubbles in mocked Chat
-   Page 4 (formarly page 3) - Rules, all rules presetrs should have icons, also list more rules presets
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Do a proper analysis of the book language before you start implementing
-   You are working with the [Agents Server](apps/agents-server) with the new agent wizard flow

![alt text](prompts/screenshots/2026-03-1380-agents-server-new-agent-wizard-4.png)
