import { spaceTrim } from 'spacetrim';
import type { BookLanguageManualDictionary } from './BookLanguageManualDictionary';

/**
 * Canonical English wording of the standalone Book language manual.
 *
 * Every other language pack is a translation of this dictionary and is resolved
 * through `getBookLanguageManualDictionary`.
 *
 * @private internal constant of `createStandaloneBookLanguageMarkdown`
 */
export const englishBookLanguageManualDictionary: BookLanguageManualDictionary = {
    language: 'en',
    title: 'Book Language blueprint',
    introLines: [
        'Canonical standalone guide for Promptbook Book Agent language.',
        'Generated from repository https://github.com/webgptorg/promptbook',
    ],
    metadataLabels: {
        bookLanguageVersion: 'Book language version',
        generatedAt: 'Generated at',
        commitmentCount: 'Number of commitments',
    },
    tableOfContentsTitle: 'Table of Contents',
    chapters: {
        whatIs: {
            title: 'What Book language is',
            body: spaceTrim(`
                Book language is a domain-specific language for defining **AI agents** as plain-text source.
                It solves these problems:

                - **One editable source of truth** for agent behavior, tools, memory, and profile metadata.
                - **Composable agent architecture** through commitments like \`FROM\`, \`IMPORT\`, and \`TEAM\`.
                - **Deterministic runtime preparation** where source is parsed and compiled into model requirements.
                - **Portable agent definitions** that can be copied, versioned, and reviewed as text.

                In this repository, "Book language" means **Book 2.0 agent language**.
            `),
        },
        mentalModel: {
            title: 'Mental model of an agent',
            body: spaceTrim(`
                Think of one agent source as four layers:

                1. **Identity/Profile layer**:
                Agent name (first non-commitment line), the last \`GOAL\`, and \`META*\` commitments.
                2. **Behavior layer**:
                \`RULE\`, \`KNOWLEDGE\`, \`WRITING SAMPLE\`, \`WRITING RULES\`, \`LANGUAGE\`, \`GOAL\`, and related commitments.
                3. **Capability layer**:
                \`USE*\` and other tooling commitments exposing runtime abilities.
                4. **Composition layer**:
                \`FROM\` inheritance, \`IMPORT\` reuse, and \`TEAM\` delegation.
            `),
        },
        howToStructure: {
            title: 'How to structure good agents',
            body: spaceTrim(`
                Recommended patterns and tradeoffs:

                1. **Single clear role first**:
                Start with one narrow \`GOAL\` describing what the agent is responsible for.
                Tradeoff: less initial flexibility, much higher reliability.
                2. **Guardrails early**:
                Add concrete \`RULE\` commitments before adding many tools.
                Tradeoff: more upfront design, fewer runtime surprises.
                3. **Grounding over improvisation**:
                Prefer \`KNOWLEDGE\` + explicit citation rule for high-stakes answers.
                Tradeoff: extra maintenance for sources, better factual control.
                4. **Composition over monoliths**:
                Use \`TEAM\`/\`IMPORT\` for specialized responsibilities.
                Tradeoff: orchestration overhead, stronger modularity and reuse.
                5. **Controlled data access**:
                If using \`USE PRIVACY\`, define what must and must not leave the conversation.
                Tradeoff: stricter policy design, better privacy and signal quality.
            `),
        },
        primitives: {
            title: 'Primitives and constructs reference',
            body: '',
        },
        commitmentCatalog: {
            title: 'Commitment catalog',
            body: spaceTrim(`
                Each commitment section explains its purpose, important details, and a focused example.
            `),
        },
        examples: {
            title: 'End-to-end examples',
        },
        pitfalls: {
            title: 'Do nots and common pitfalls',
        },
        tutorial: {
            title: 'Build an agent from scratch (offline tutorial)',
            body: spaceTrim(`
                This tutorial is sufficient without internet access.

                1. **Define role and goal**
                Create a short name line and one clear \`GOAL\`.
                2. **Add behavioral constraints**
                Add 3-6 specific \`RULE\` commitments covering scope, tone, and safety boundaries.
                3. **Add grounding**
                Add \`KNOWLEDGE\` commitments (inline text or local/importable sources).
                4. **Add capabilities**
                Add only necessary \`USE*\` commitments.
                5. **Set profile metadata**
                Add \`META DESCRIPTION\`, \`META AVATAR\` / \`META VISUAL\` or \`META IMAGE\`, \`META INPUT PLACEHOLDER\`, \`META THINKING MESSAGE\`, and disclaimers if needed.
                6. **Add first interaction**
                Add \`INITIAL MESSAGE\` and optionally sample \`USER MESSAGE\` / \`AGENT MESSAGE\` pairs.
                7. **Close for deterministic behavior (optional)**
                Add \`CLOSED\` when you want stable non-self-modifying behavior.
            `),
        },
        lowLevelCommitments: {
            title: 'Low level commitments',
            body: spaceTrim(`
                The commitments below are fully part of Book language, but they are intended for advanced use only.
                Most agents never need them, and using them incorrectly makes an agent harder to maintain.

                Reach for them only when a specific technical requirement cannot be expressed with the commitments above.
            `),
        },
    },
    mentalModelSections: {
        detectedIntro: 'Agent composition commitments in current runtime:',
        detectedProfileLabel: 'Profile-centric commitments detected',
        detectedBehaviorLabel: 'Behavior-centric commitments detected',
        detectedToolingLabel: 'Tool/runtime commitments detected',
        detectedCompositionLabel: 'Composition commitments detected',
        meta: {
            title: 'META commitments and agent profile',
            body: spaceTrim(`
                \`META*\` commitments control profile data shown in UI (for example avatar visual, image, description, disclaimers, domain, input placeholder).
                They generally shape presentation/metadata rather than tool behavior.
            `),
        },
        inheritance: {
            title: 'FROM inheritance',
            body: spaceTrim(`
                \`FROM\` points to a parent agent source. During inheritance resolution:

                - Parent corpus is merged into effective source.
                - \`FROM {Void}\` / \`FROM VOID\` means explicit "no parent".
                - Missing references are surfaced as notes in resolved source.
            `),
        },
        composition: {
            title: 'TEAM and IMPORT',
            body: spaceTrim(`
                - \`TEAM\` registers teammate agents as callable tools.
                - \`IMPORT\` injects imported agent/file content into current agent context.
                - In Agents Server, compact references like \`{Legal Reviewer}\` can resolve to embedded in-book agents.
            `),
        },
        capabilities: {
            title: 'USE commitments',
            body: spaceTrim(`
                \`USE*\` commitments enable capabilities (project integration, calendar, image generation, etc.).
                They expose runtime tools and system-message guidance used during execution.
            `),
        },
    },
    primitivesSections: {
        coreSyntax: {
            title: 'Core syntax primitives',
            body: spaceTrim(`
                1. **Agent title**:
                First non-empty line that is not a commitment keyword.
                2. **Commitment block**:
                Starts with a commitment keyword and continues until the next commitment block or separator.
                3. **Multiple agent**:
                Lines like \`---\` separate agents defined in the same Book source.
                4. **Code fences**:
                Start and end with <code>\`\`\`</code>; their content is preserved inside commitments and is useful for examples and instructions.
            `),
        },
        references: {
            title: 'Reference tokens and pseudo-agents',
            body: spaceTrim(`
                - \`@Foo\` and \`{Foo foo}\` reference another agent; they are not parameter notation.
                - Compact references like \`@Agent Name\` and \`{Agent Name}\` are resolved by the Agents Server reference resolver.
                - Pseudo-agent forms (for example \`{User}\`, \`{Void}\`) are supported in relevant commitments.
                - \`{User}\` is intended for \`TEAM\`; \`{Void}\` is useful for explicit no-parent inheritance.
            `),
        },
    },
    commitmentCatalogTitleSuffixes: {
        usedFirst: ' (used commitments first)',
        all: ' (all commitments)',
    },
    commitmentLabels: {
        aliases: 'Aliases',
    },
    exampleLabels: {
        commitmentsUsed: 'Commitments used',
        fullSource: 'Full source',
        goal: 'Goal',
        walkthrough: 'Walkthrough',
        noCommitments: 'None',
    },
    exampleTexts: {
        'minimal-hello-world-agent': {
            title: 'Minimal hello-world agent',
            goal: 'Create the smallest useful agent with identity and greeting.',
            walkthrough: [
                'The first line (`Hello World Agent`) is the agent name.',
                '`GOAL` defines the effective role and profile text.',
                '`INITIAL MESSAGE` sets a deterministic first message for a new chat.',
                '`CLOSED` prevents conversational self-modification.',
            ],
        },
        'rule-and-knowledge-agent': {
            title: 'Agent with RULE and KNOWLEDGE',
            goal: 'Ground responses in explicit constraints and curated sources.',
            walkthrough: [
                '`KNOWLEDGE` may be inline text or an external URL/document.',
                '`RULE` commitments define non-negotiable behavior constraints.',
                'Combining both creates predictable, grounded policy responses.',
                'Use this pattern for compliance, support, and internal procedures.',
            ],
        },
        'use-project-integration-agent': {
            title: 'USE PROJECT external integration',
            goal: 'Work with a GitHub repository through a connected project integration.',
            walkthrough: [
                '`USE PROJECT` enables repository tools for listing, reading, editing files, and creating PRs.',
                'Credentials are resolved from wallet records at runtime in Agents Server.',
                'The agent also defines explicit rules for safe editing and credential handling.',
                'Use this pattern when an agent needs focused repository access.',
            ],
        },
        'use-calendar-integration-agent': {
            title: 'USE CALENDAR integration',
            goal: 'Coordinate meetings and schedules through a connected Google Calendar.',
            walkthrough: [
                '`USE CALENDAR` enables calendar tools for listing, reading, creating, updating, and deleting events.',
                'The first calendar URL identifies which calendar integration should be used.',
                '`SCOPES` can explicitly request required Google Calendar OAuth permissions.',
                'Credentials are resolved from wallet-backed Google Calendar OAuth records at runtime in Agents Server.',
            ],
        },
        'agents-team-example': {
            title: 'Agents TEAM (with in-book teammates)',
            goal: 'Delegate sub-tasks to specialized teammates.',
            walkthrough: [
                'The main agent delegates via `TEAM` commitment.',
                'References in `{...}` are resolved against embedded agents inside the same book (split by `---`).',
                'Each teammate can be isolated with `FROM VOID` for deterministic specialization.',
                'This pattern works well for multi-role review and decision support.',
            ],
        },
    },
    pitfallLabels: {
        dont: "Don't",
        doInstead: 'Do instead',
    },
    pitfalls: [
        {
            title: 'Too broad agent scope',
            dont: 'One agent tries to be a lawyer, developer, marketer, and researcher at once.',
            doInstead: 'Split into focused agents and orchestrate with TEAM or IMPORT.',
        },
        {
            title: 'Unverifiable claims',
            dont: 'The agent answers internet-dependent questions without tools or without citing sources.',
            doInstead: 'Add `KNOWLEDGE` sources and a citation-oriented `RULE`.',
        },
        {
            title: 'Missing guardrails',
            dont: 'Only the agent goal is defined, with no behavioral constraints.',
            doInstead: 'Add concrete `RULE` commitments for safety, scope, and tone.',
        },
        {
            title: 'Overloaded inheritance',
            dont: 'Using deep `FROM` chains without documenting why each parent is needed.',
            doInstead: 'Keep inheritance shallow and use focused IMPORT/TEAM composition for reuse.',
        },
    ],
    tutorialSections: {
        serverAgentsHint:
            'Use one of the selected server-agent examples above as your starting point, then retain only the commitments needed for the new agent.',
        templateIntro: 'Copy-paste template:',
        checklistTitle: 'Validation checklist:',
        checklistBody: spaceTrim(`
            - Does each commitment have a clear purpose?
            - Are there explicit constraints against hallucination and unsafe behavior?
            - Are tools only enabled when genuinely needed?
            - Is memory usage bounded by clear rules?
            - Is composition (\`FROM\`/\`TEAM\`/\`IMPORT\`) justified and understandable?
        `),
    },
    footer: {
        title: 'Generated from:',
        body: spaceTrim(`
            - [Commitments registry and runtime documentation](https://github.com/webgptorg/promptbook/tree/main/src/commitments)
            - [Book language parser and source handling](https://github.com/webgptorg/promptbook/tree/main/src/book-2.0/agent-source)
            - [Agents Server reference and inheritance resolution](https://github.com/webgptorg/promptbook/tree/main/apps/agents-server/src/utils)
            - [Standalone manual source](https://github.com/webgptorg/promptbook/tree/main/src/book-2.0/book-language-documentation)
        `),
    },
};
