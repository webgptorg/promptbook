import { BOOK_LANGUAGE_VERSION, getGroupedCommitmentDefinitions } from '@promptbook-local/core';
import spaceTrim from 'spacetrim';
import { NotYetImplementedCommitmentDefinition } from '../../../../../src/commitments/_base/NotYetImplementedCommitmentDefinition';
import type { BookLanguageDocumentationExample } from './BookLanguageDocumentationExample';
import { bookLanguageCommonPitfalls } from './bookLanguageCommonPitfalls';
import { bookLanguageDocumentationExamples } from './bookLanguageDocumentationExamples';

/**
 * Commitment types that primarily model composition of multiple agents.
 */
const COMPOSITION_COMMITMENT_TYPES = new Set(['FROM', 'IMPORT', 'IMPORTS', 'TEAM']);

/**
 * Commitment types that expose tools/runtime capabilities.
 */
const TOOLING_COMMITMENT_TYPES = new Set([
    'USE',
    'USE BROWSER',
    'USE SEARCH ENGINE',
    'USE SEARCH',
    'USE SPAWN',
    'USE EMAIL',
    'USE POPUP',
    'USE TIME',
    'USE USER LOCATION',
    'USE PROJECT',
    'USE IMAGE GENERATOR',
    'USE MCP',
    'USE PRIVACY',
    'MEMORY',
    'MEMORIES',
]);

/**
 * Commitment types that primarily define agent profile metadata.
 */
const PROFILE_COMMITMENT_TYPES = new Set([
    'PERSONA',
    'PERSONAE',
    'META',
    'META IMAGE',
    'META LINK',
    'META DOMAIN',
    'META DESCRIPTION',
    'META DISCLAIMER',
    'META INPUT PLACEHOLDER',
    'META COLOR',
    'META FONT',
    'META VOICE',
    'INITIAL MESSAGE',
    'MODEL',
    'MODELS',
]);

/**
 * Commitment types that primarily define behavioral constraints or prompt shaping.
 */
const BEHAVIOR_COMMITMENT_TYPES = new Set([
    'RULE',
    'RULES',
    'KNOWLEDGE',
    'GOAL',
    'GOALS',
    'STYLE',
    'STYLES',
    'LANGUAGE',
    'LANGUAGES',
    'FORMAT',
    'FORMATS',
    'ACTION',
    'ACTIONS',
    'SAMPLE',
    'EXAMPLE',
    'SCENARIO',
    'SCENARIOS',
    'MESSAGE',
    'MESSAGES',
    'MESSAGE SUFFIX',
    'USER MESSAGE',
    'AGENT MESSAGE',
    'INTERNAL MESSAGE',
    'OPEN',
    'CLOSED',
]);

/**
 * One grouped commitment definition as returned by the runtime registry.
 */
type GroupedCommitmentDefinition = ReturnType<typeof getGroupedCommitmentDefinitions>[number];

/**
 * Creates one standalone markdown guide for Book language (Book 2.0 / agent language).
 *
 * The output intentionally combines:
 * - static conceptual building blocks maintained in this repository
 * - dynamically generated commitment catalog from runtime commitment definitions
 * so docs stay up-to-date by design.
 *
 * @returns Full standalone markdown document.
 */
export function createStandaloneBookLanguageMarkdown(): string {
    const groupedCommitments = getGroupedCommitmentDefinitions();
    const generatedAtIso = new Date().toISOString();
    const placeholderCommitmentCount = groupedCommitments.filter(({ primary }) =>
        primary instanceof NotYetImplementedCommitmentDefinition,
    ).length;
    const implementedCommitmentCount = groupedCommitments.length - placeholderCommitmentCount;

    const allCommitmentKeywords = groupedCommitments.flatMap(({ primary, aliases }) => [primary.type, ...aliases]);
    const toolingCommitments = groupedCommitments.filter(({ primary }) => TOOLING_COMMITMENT_TYPES.has(primary.type));
    const profileCommitments = groupedCommitments.filter(({ primary }) => PROFILE_COMMITMENT_TYPES.has(primary.type));
    const compositionCommitments = groupedCommitments.filter(({ primary }) =>
        COMPOSITION_COMMITMENT_TYPES.has(primary.type),
    );
    const behaviorCommitments = groupedCommitments.filter(({ primary }) => BEHAVIOR_COMMITMENT_TYPES.has(primary.type));

    return spaceTrim(
        (block) => `
            # Book Language (Book 2.0) Standalone Documentation

            > Canonical standalone guide for Promptbook Agent language (Book 2.0).  
            > Generated from repository source-of-truth blocks and live commitment definitions.

            - Book language version: \`${BOOK_LANGUAGE_VERSION}\`
            - Generated at: \`${generatedAtIso}\`
            - Commitment groups: \`${groupedCommitments.length}\`
            - Implemented commitments: \`${implementedCommitmentCount}\`
            - Placeholder commitments: \`${placeholderCommitmentCount}\`

            ## <a id="table-of-contents"></a>Table of Contents

            - [What Book language is](#what-book-language-is)
            - [Execution and compilation model](#execution-and-compilation-model)
            - [Mental model of an agent](#mental-model-of-an-agent)
            - [How to structure good agents](#how-to-structure-good-agents)
            - [Primitives and constructs reference](#primitives-and-constructs-reference)
            - [Commitment catalog (all commitments)](#commitment-catalog-all-commitments)
            - [End-to-end examples](#end-to-end-examples)
            - [Do nots and common pitfalls](#do-nots-and-common-pitfalls)
            - [Build an agent from scratch (offline tutorial)](#build-an-agent-from-scratch-offline-tutorial)

            ## <a id="what-book-language-is"></a>What Book language is

            Book language is a domain-specific language for defining **AI agents** as plain-text source.
            It solves these problems:

            - **One editable source of truth** for agent behavior, tools, memory, and profile metadata.
            - **Composable agent architecture** through commitments like \`FROM\`, \`IMPORT\`, and \`TEAM\`.
            - **Deterministic runtime preparation** where source is parsed and compiled into model requirements.
            - **Portable agent definitions** that can be copied, versioned, and reviewed as text.

            In this repository, "Book language" means **Book 2.0 agent language**.

            ## <a id="execution-and-compilation-model"></a>Execution and compilation model

            Promptbook and Agents Server use two core passes:

            1. **Fast parse pass** (\`parseAgentSource\`):
            It synchronously extracts agent profile/basic info (name, persona, meta, capabilities, samples, references).
            2. **Compilation pass** (\`createAgentModelRequirements\`):
            It applies commitments in sequence and builds executable model requirements (system message, tools, memory/tool metadata, imports, etc.).

            In Agents Server, the runtime flow typically includes:

            1. Resolve scoped references (including in-book references like \`{Some Agent}\`).
            2. Resolve inheritance/import chains into effective source.
            3. Compile effective source into model requirements.
            4. Execute chat turns with resolved tools and runtime adapters.

            ## <a id="mental-model-of-an-agent"></a>Mental model of an agent

            Think of one agent source as four layers:

            1. **Identity/Profile layer**:
            Agent name (first non-commitment line), \`PERSONA\`, and \`META*\` commitments.
            2. **Behavior layer**:
            \`RULE\`, \`KNOWLEDGE\`, \`STYLE\`, \`LANGUAGE\`, \`GOAL\`, and related commitments.
            3. **Capability layer**:
            \`USE*\`, \`MEMORY\`, and other tooling commitments exposing runtime abilities.
            4. **Composition layer**:
            \`FROM\` inheritance, \`IMPORT\` reuse, and \`TEAM\` delegation.

            Agent composition commitments in current runtime:

            - Profile-centric commitments detected: ${profileCommitments.map(({ primary }) => `\`${primary.type}\``).join(', ')}
            - Behavior-centric commitments detected: ${behaviorCommitments.map(({ primary }) => `\`${primary.type}\``).join(', ')}
            - Tool/runtime commitments detected: ${toolingCommitments.map(({ primary }) => `\`${primary.type}\``).join(', ')}
            - Composition commitments detected: ${compositionCommitments.map(({ primary }) => `\`${primary.type}\``).join(', ')}

            ### META commitments and agent profile

            \`META*\` commitments control profile data shown in UI (for example image, description, disclaimers, domain, input placeholder).  
            They generally shape presentation/metadata rather than tool behavior.

            ### FROM inheritance

            \`FROM\` points to a parent agent source. During inheritance resolution:

            - Parent corpus is merged into effective source.
            - \`FROM {Void}\` / \`FROM VOID\` means explicit "no parent".
            - Missing references are surfaced as notes in resolved source.

            ### TEAM and IMPORT

            - \`TEAM\` registers teammate agents as callable tools.
            - \`IMPORT\` injects imported agent/file content into current agent context.
            - In Agents Server, compact references like \`{Legal Reviewer}\` can resolve to embedded in-book agents.

            ### USE commitments

            \`USE*\` commitments enable capabilities (search, browser, project integration, email, image generation, etc.).
            They expose runtime tools and system-message guidance used during execution.

            ## <a id="how-to-structure-good-agents"></a>How to structure good agents

            Recommended patterns and tradeoffs:

            1. **Single clear role first**:
            Start with one role-focused \`PERSONA\` and a narrow \`GOAL\`.
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
            5. **Controlled memory**:
            If using \`MEMORY\`, define what must and must not be remembered.
            Tradeoff: stricter policy design, better privacy and signal quality.

            ## <a id="primitives-and-constructs-reference"></a>Primitives and constructs reference

            ### Core syntax primitives

            1. **Agent title**:
            First non-empty line that is not a commitment keyword.
            2. **Commitment block**:
            Starts with a commitment keyword and continues until the next commitment block or separator.
            3. **Horizontal separator**:
            Lines like \`---\` split sections; in Agents Server they can delimit embedded in-book agents.
            4. **Code fences**:
            Preserved inside commitment content; useful for examples/instructions.
            5. **Parameters**:
            Both \`@parameter\` and \`{parameter}\` notations are supported and parsed.

            ### Reference tokens and pseudo-agents

            - Compact references like \`{Agent Name}\` are resolved by Agents Server reference resolver.
            - Pseudo-agent forms (for example \`{User}\`, \`{Void}\`) are supported in relevant commitments.
            - \`{User}\` is intended for \`TEAM\`; \`{Void}\` is useful for explicit no-parent inheritance.

            ### Commitment keywords currently recognized

            ${block(getSafeCodeBlock(allCommitmentKeywords.join(', '), 'text'))}

            ## <a id="commitment-catalog-all-commitments"></a>Commitment catalog (all commitments)

            This section is generated from commitment definitions in \`src/commitments\`.
            For each commitment group you get:

            - semantics summary (description/icon/status)
            - parsing schema (\`createTypeRegex\` and \`createRegex\`)
            - canonical documentation block

            ${block(groupedCommitments.map(renderCommitmentCatalogSection).join('\n\n'))}

            ## <a id="end-to-end-examples"></a>End-to-end examples

            ${block(bookLanguageDocumentationExamples.map(renderExampleSection).join('\n\n'))}

            ## <a id="do-nots-and-common-pitfalls"></a>Do nots and common pitfalls

            ${block(
                bookLanguageCommonPitfalls
                    .map(
                        (pitfall, index) => spaceTrim(`
                            ${index + 1}. **${pitfall.title}**
                            - Don't: ${pitfall.dont}
                            - Do instead: ${pitfall.doInstead}
                        `),
                    )
                    .join('\n'),
            )}

            ## <a id="build-an-agent-from-scratch-offline-tutorial"></a>Build an agent from scratch (offline tutorial)

            This tutorial is sufficient without internet access.

            1. **Define role and goal**
            Create a short name line, one \`PERSONA\`, and one \`GOAL\`.
            2. **Add behavioral constraints**
            Add 3-6 specific \`RULE\` commitments covering scope, tone, and safety boundaries.
            3. **Add grounding**
            Add \`KNOWLEDGE\` commitments (inline text or local/importable sources).
            4. **Add capabilities**
            Add only necessary \`USE*\` and/or \`MEMORY\` commitments.
            5. **Set profile metadata**
            Add \`META DESCRIPTION\`, \`META IMAGE\`, \`META INPUT PLACEHOLDER\`, and disclaimers if needed.
            6. **Add first interaction**
            Add \`INITIAL MESSAGE\` and optionally sample \`USER MESSAGE\` / \`AGENT MESSAGE\` pairs.
            7. **Close for deterministic behavior (optional)**
            Add \`CLOSED\` when you want stable non-self-modifying behavior.

            Copy-paste template:

            ${block(
                getSafeCodeBlock(
                    spaceTrim(`
                        Project Assistant

                        PERSONA You are a focused assistant for project planning and execution.
                        GOAL Help the user turn ideas into concrete deliverables.

                        RULE Ask clarifying questions when requirements are ambiguous.
                        RULE Provide concise, structured outputs with actionable steps.
                        RULE If information is missing, state assumptions explicitly.
                        RULE Do not invent facts.

                        KNOWLEDGE Team works in two-week sprints and tracks tasks in Kanban.
                        KNOWLEDGE Preferred output format: summary, plan, risks, next action.

                        META DESCRIPTION Practical project-planning assistant.
                        META INPUT PLACEHOLDER Describe your project goal or blocker...

                        INITIAL MESSAGE Share your project goal and current blocker, and I will propose a concrete next-step plan.
                        CLOSED
                    `),
                    'book',
                ),
            )}

            Validation checklist:

            - Does each commitment have a clear purpose?
            - Are there explicit constraints against hallucination and unsafe behavior?
            - Are tools only enabled when genuinely needed?
            - Is memory usage bounded by clear rules?
            - Is composition (\`FROM\`/\`TEAM\`/\`IMPORT\`) justified and understandable?

            ---

            Generated from:

            - Commitments registry and runtime docs in \`src/commitments\`
            - Parser/compiler behavior in \`src/book-2.0/agent-source\`
            - Agents Server reference/inheritance resolution in \`apps/agents-server/src/utils\`
            - Standalone docs source blocks in \`apps/agents-server/src/utils/bookLanguageDocumentation\`
        `,
    );
}

/**
 * Renders one commitment section in the generated catalog.
 *
 * @param groupedCommitment - Grouped commitment definition with aliases.
 * @returns Markdown section for a single commitment.
 */
function renderCommitmentCatalogSection(groupedCommitment: GroupedCommitmentDefinition): string {
    const { primary, aliases } = groupedCommitment;
    const status =
        primary instanceof NotYetImplementedCommitmentDefinition
            ? 'Placeholder (not fully implemented)'
            : 'Implemented';
    const aliasText = aliases.length === 0 ? 'None' : aliases.map((alias) => `\`${alias}\``).join(', ');
    const documentationWithoutLeadingHeading = removeLeadingTopLevelHeading(primary.documentation);

    return spaceTrim(
        (block) => `
            ### <a id="commitment-${toStableAnchorId(primary.type)}"></a>${primary.icon} ${primary.type}

            - **Status:** ${status}
            - **Aliases:** ${aliasText}
            - **Semantics:** ${primary.description}
            - **Type schema (\`createTypeRegex\`):** \`${stringifyRegex(primary.createTypeRegex())}\`
            - **Block schema (\`createRegex\`):** \`${stringifyRegex(primary.createRegex())}\`

            ${block(documentationWithoutLeadingHeading)}
        `,
    );
}

/**
 * Renders one end-to-end example section.
 *
 * @param example - Example definition.
 * @returns Markdown section for one example.
 */
function renderExampleSection(example: BookLanguageDocumentationExample): string {
    return spaceTrim(
        (block) => `
            ### <a id="example-${toStableAnchorId(example.id)}"></a>${example.title}

            **Goal:** ${example.goal}

            **Full source**

            ${block(getSafeCodeBlock(example.source, 'book'))}

            **Walkthrough**

            ${block(example.walkthrough.map((step, index) => `${index + 1}. ${step}`).join('\n'))}
        `,
    );
}

/**
 * Converts a heading label into a stable markdown anchor id.
 *
 * @param value - Raw heading/identifier text.
 * @returns Stable lowercase anchor id.
 */
function toStableAnchorId(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Converts a regular expression into a concise literal-like string.
 *
 * @param regex - Regex instance.
 * @returns Printable regex pattern and flags.
 */
function stringifyRegex(regex: RegExp): string {
    return `/${regex.source}/${regex.flags}`;
}

/**
 * Removes only the first top-level markdown heading from a documentation block.
 *
 * Commitment docs usually start with `# COMMITMENT_NAME`; removing it keeps the
 * generated catalog hierarchy cleaner while preserving the rest of the source docs.
 *
 * @param markdown - Original markdown.
 * @returns Markdown without the first top-level heading.
 */
function removeLeadingTopLevelHeading(markdown: string): string {
    return markdown.replace(/^\s*#\s+[^\n]+\n*/u, '').trim();
}

/**
 * Creates a safe markdown fenced code block even when content contains backticks.
 *
 * @param content - Raw code content.
 * @param language - Optional info-string language label.
 * @returns Fenced code block.
 */
function getSafeCodeBlock(content: string, language = 'markdown'): string {
    const maxBacktickCount = Math.max(0, ...(content.match(/`+/g) || []).map((match) => match.length));
    const fence = '`'.repeat(Math.max(3, maxBacktickCount + 1));
    return `${fence}${language}\n${content}\n${fence}`;
}
