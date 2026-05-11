import { spaceTrim } from 'spacetrim';
import type { string_javascript_name } from '../../_packages/types.index';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import type { string_knowledge_source_link } from '../../types/typeAliases';
import { extractUrlsFromText } from '../../utils/validators/url/extractUrlsFromText';
import {
    InlineKnowledgeSourceFile,
    createInlineKnowledgeSourceFile,
} from '../../utils/knowledge/inlineKnowledgeSource';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * Name of the tool used by agents to search configured `KNOWLEDGE` sources.
 *
 * @public exported from `@promptbook/core`
 */
export const KNOWLEDGE_SEARCH_TOOL_NAME = 'knowledge_search' as string_javascript_name;

/**
 * Title of the system-message section generated for `KNOWLEDGE` commitments.
 *
 * @private constant of `KnowledgeCommitmentDefinition`
 */
const KNOWLEDGE_SEARCH_SYSTEM_SECTION_TITLE = 'Knowledge Search';

/**
 * KNOWLEDGE commitment definition
 *
 * The KNOWLEDGE commitment adds specific knowledge, facts, or context to the agent
 * using RAG (Retrieval-Augmented Generation) approach for external sources.
 *
 * Supports both direct text knowledge and external sources like PDFs.
 *
 * Example usage in agent source:
 *
 * ```book
 * KNOWLEDGE The company was founded in 2020 and specializes in AI-powered solutions
 * KNOWLEDGE https://example.com/company-handbook.pdf
 * KNOWLEDGE https://example.com/product-documentation.pdf
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class KnowledgeCommitmentDefinition extends BaseCommitmentDefinition<'KNOWLEDGE'> {
    public constructor() {
        super('KNOWLEDGE');
    }

    /**
     * Short one-line description of KNOWLEDGE.
     */
    get description(): string {
        return 'Add domain **knowledge** via direct text or external sources (RAG).';
    }

    /**
     * Marks KNOWLEDGE as one of the priority commitments surfaced first in catalogues.
     */
    public override get isImportant(): boolean {
        return true;
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '🧠';
    }

    /**
     * Markdown documentation for KNOWLEDGE commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # ${this.type}

            Adds specific knowledge, facts, or context to the agent using a RAG (Retrieval-Augmented Generation) approach for external sources.

            ## Key aspects

            - Both terms work identically and can be used interchangeably.
            - Supports both direct text knowledge and external URLs.
            - External sources (PDFs, websites) are processed via RAG for context retrieval.

            ## Supported formats

            - Direct text: Immediate knowledge incorporated into agent
            - URLs: External documents processed for contextual retrieval
            - Supported file types: PDF, text, markdown, HTML

            ## Examples

            \`\`\`book
            Customer Support Bot

            PERSONA You are a helpful customer support agent for TechCorp
            KNOWLEDGE TechCorp was founded in 2020 and specializes in AI-powered solutions
            KNOWLEDGE https://example.com/company-handbook.pdf
            KNOWLEDGE https://example.com/product-documentation.pdf
            RULE Always be polite and professional
            \`\`\`

            \`\`\`book
            Research Assistant

            PERSONA You are a knowledgeable research assistant
            KNOWLEDGE Academic research requires careful citation and verification
            KNOWLEDGE https://example.com/research-guidelines.pdf
            ACTION Can help with literature reviews and data analysis
            WRITING RULES Present information in clear, academic format
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const trimmedContent = content.trim();

        if (!trimmedContent) {
            return requirements;
        }

        const extractedUrls = extractUrlsFromText(trimmedContent);
        const knowledgeSources = [...(requirements.knowledgeSources ?? [])];
        const existingKnowledgeSources = new Set(knowledgeSources);
        const knowledgeInfoEntries: string[] = [];

        for (const url of extractedUrls) {
            if (existingKnowledgeSources.has(url)) {
                continue;
            }

            knowledgeSources.push(url as string_knowledge_source_link);
            existingKnowledgeSources.add(url);
            knowledgeInfoEntries.push(`Knowledge Source URL: ${url} (will be processed for retrieval during chat)`);
        }

        let nextRequirements: AgentModelRequirements =
            knowledgeInfoEntries.length > 0
                ? {
                      ...requirements,
                      knowledgeSources,
                  }
                : requirements;

        if (extractedUrls.length === 0 || hasMeaningfulNonUrlText(trimmedContent, extractedUrls)) {
            const inlineSource = createInlineKnowledgeSourceFile(trimmedContent);
            const existingInlineSources = (
                (nextRequirements._metadata?.inlineKnowledgeSources as InlineKnowledgeSourceFile[]) || []
            ).slice();

            nextRequirements = {
                ...nextRequirements,
                _metadata: {
                    ...nextRequirements._metadata,
                    inlineKnowledgeSources: [...existingInlineSources, inlineSource],
                },
            };

            knowledgeInfoEntries.push(
                `Knowledge Source Inline: ${inlineSource.filename} (derived from inline content and processed for retrieval during chat)`,
            );
        }

        if (knowledgeInfoEntries.length === 0) {
            return addKnowledgeSearchToolAndSystemSection(nextRequirements);
        }

        return addKnowledgeSearchToolAndSystemSection(nextRequirements);
    }

    /**
     * Gets human-readable titles for tool functions provided by this commitment.
     */
    getToolTitles(): Record<string_javascript_name, string> {
        return {
            [KNOWLEDGE_SEARCH_TOOL_NAME]: 'Knowledge search',
        };
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */

/**
 * Returns true when the commitment text contains meaningful non-URL content.
 */
function hasMeaningfulNonUrlText(content: string, urls: ReadonlyArray<string>): boolean {
    const contentWithoutUrls = urls.reduce((result, url) => result.split(url).join(' '), content);
    const significantText = contentWithoutUrls.replace(/[\s.,!?;:'"`()[\]{}<>/-]+/g, '');

    return significantText.length > 0;
}

/**
 * Adds the shared `knowledge_search` tool definition and the consolidated system-message section.
 *
 * @param requirements - Requirements after one `KNOWLEDGE` commitment was applied.
 * @returns Requirements with the knowledge search instructions and tool definition.
 *
 * @private internal utility of `KnowledgeCommitmentDefinition`
 */
function addKnowledgeSearchToolAndSystemSection(requirements: AgentModelRequirements): AgentModelRequirements {
    const nextRequirements = addKnowledgeSearchTool(requirements);
    const section = createKnowledgeSearchSystemSection(nextRequirements);
    const sectionHeader = `## ${KNOWLEDGE_SEARCH_SYSTEM_SECTION_TITLE}`;

    if (nextRequirements.systemMessage.includes(sectionHeader)) {
        return {
            ...nextRequirements,
            systemMessage: nextRequirements.systemMessage.replace(
                new RegExp(
                    `## ${KNOWLEDGE_SEARCH_SYSTEM_SECTION_TITLE.replace(
                        /[.*+?^${}()|[\]\\]/g,
                        '\\$&',
                    )}[\\s\\S]*?(?=\\n\\n##|$)`,
                ),
                section,
            ),
        };
    }

    return {
        ...nextRequirements,
        systemMessage: nextRequirements.systemMessage.trim()
            ? `${nextRequirements.systemMessage}\n\n${section}`
            : section,
    };
}

/**
 * Adds the `knowledge_search` model tool when it is not already present.
 *
 * @param requirements - Current model requirements.
 * @returns Requirements with the tool definition available to the model.
 *
 * @private internal utility of `KnowledgeCommitmentDefinition`
 */
function addKnowledgeSearchTool(requirements: AgentModelRequirements): AgentModelRequirements {
    const existingTools = requirements.tools || [];

    if (existingTools.some((tool) => tool.name === KNOWLEDGE_SEARCH_TOOL_NAME)) {
        return requirements;
    }

    return {
        ...requirements,
        tools: [
            ...existingTools,
            {
                name: KNOWLEDGE_SEARCH_TOOL_NAME,
                description: spaceTrim(`
                    Search the agent's configured knowledge sources and return relevant excerpts with citation ids.
                    Use this before answering questions that may depend on the agent's KNOWLEDGE commitments.
                `),
                parameters: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'The natural-language search query for the knowledge base.',
                        },
                        limit: {
                            type: 'integer',
                            description: 'Maximum number of matching source excerpts to return.',
                        },
                    },
                    required: ['query'],
                },
            },
        ],
    };
}

/**
 * Creates the model-facing system-message section for knowledge search.
 *
 * @param requirements - Current model requirements.
 * @returns Markdown system-message section.
 *
 * @private internal utility of `KnowledgeCommitmentDefinition`
 */
function createKnowledgeSearchSystemSection(requirements: AgentModelRequirements): string {
    const sourceEntries = createKnowledgeSourceSystemEntries(requirements);
    const sourceList = sourceEntries.length > 0 ? sourceEntries.map((entry) => `-   ${entry}`).join('\n') : '-   None';

    return spaceTrim(`
        ## ${KNOWLEDGE_SEARCH_SYSTEM_SECTION_TITLE}

        -   Use \`${KNOWLEDGE_SEARCH_TOOL_NAME}\` to search the configured knowledge sources before answering questions that depend on this agent's knowledge base.
        -   Base source-backed factual answers on the returned excerpts.
        -   When you use a returned excerpt, include its citation marker in the answer body, for example \`[0:0]\`.
        -   If the search returns no relevant information, say that the knowledge base did not contain the answer instead of inventing it.

        Configured knowledge sources:
        ${sourceList}
    `);
}

/**
 * Builds a stable list of configured knowledge sources for system-message diagnostics.
 *
 * @param requirements - Current model requirements.
 * @returns Human-readable source entries.
 *
 * @private internal utility of `KnowledgeCommitmentDefinition`
 */
function createKnowledgeSourceSystemEntries(requirements: AgentModelRequirements): string[] {
    const entries: string[] = [];
    const seenEntries = new Set<string>();

    for (const source of requirements.knowledgeSources || []) {
        const entry = `Source URL: ${source} (processed for retrieval during chat)`;
        if (seenEntries.has(entry)) {
            continue;
        }

        seenEntries.add(entry);
        entries.push(entry);
    }

    const inlineSources = ((requirements._metadata?.inlineKnowledgeSources as InlineKnowledgeSourceFile[]) || [])
        .map((source) => source.filename)
        .filter(Boolean);

    for (const filename of inlineSources) {
        const entry = `Knowledge Source Inline: ${filename} (Inline source: processed for retrieval during chat)`;
        if (seenEntries.has(entry)) {
            continue;
        }

        seenEntries.add(entry);
        entries.push(entry);
    }

    return entries;
}
