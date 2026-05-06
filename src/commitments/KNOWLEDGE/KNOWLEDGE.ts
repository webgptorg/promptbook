import { spaceTrim } from 'spacetrim';
import type { string_javascript_name } from '../../_packages/types.index';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import type { ToolFunction } from '../../scripting/javascript/JavascriptExecutionToolsOptions';
import type { string_knowledge_source_link } from '../../types/typeAliases';
import { extractUrlsFromText } from '../../utils/validators/url/extractUrlsFromText';
import {
    InlineKnowledgeSourceFile,
    createInlineKnowledgeSourceFile,
} from '../../utils/knowledge/inlineKnowledgeSource';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';
import { createKnowledgeSystemMessage } from './createKnowledgeSystemMessage';
import { createKnowledgeToolFunctions } from './createKnowledgeToolFunctions';
import { createKnowledgeTools } from './createKnowledgeTools';

export { setKnowledgeToolRuntimeAdapter } from './setKnowledgeToolRuntimeAdapter';
export type {
    KnowledgeToolRuntimeAdapter,
    KnowledgeToolRuntimeContext,
    KnowledgeToolSource,
    SearchKnowledgeToolResult,
} from './KnowledgeToolRuntimeAdapter';

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

        const tools = createKnowledgeTools(requirements.tools);
        const extractedUrls = extractUrlsFromText(trimmedContent);
        const knowledgeSources = [...(requirements.knowledgeSources ?? [])];
        const existingKnowledgeSources = new Set(knowledgeSources);
        const existingKnowledgeInfoEntries = ((requirements._metadata?.knowledgeInfoEntries as string[]) || []).slice();
        const nextKnowledgeInfoEntries = [...existingKnowledgeInfoEntries];

        for (const url of extractedUrls) {
            if (existingKnowledgeSources.has(url)) {
                continue;
            }

            knowledgeSources.push(url as string_knowledge_source_link);
            existingKnowledgeSources.add(url);
            nextKnowledgeInfoEntries.push(`${url} (processed for retrieval during chat)`);
        }

        let nextRequirements: AgentModelRequirements =
            nextKnowledgeInfoEntries.length > existingKnowledgeInfoEntries.length || requirements.tools !== tools
                ? {
                      ...requirements,
                      knowledgeSources,
                      tools,
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
                    knowledgeInfoEntries: nextKnowledgeInfoEntries,
                },
            };

            nextKnowledgeInfoEntries.push(`${inlineSource.filename} (derived from inline content and processed for retrieval during chat)`);
        } else {
            nextRequirements = {
                ...nextRequirements,
                _metadata: {
                    ...nextRequirements._metadata,
                    knowledgeInfoEntries: nextKnowledgeInfoEntries,
                },
            };
        }

        if (nextKnowledgeInfoEntries.length === 0) {
            return nextRequirements;
        }

        return this.replaceOrCreateSection(
            nextRequirements,
            'Knowledge',
            createKnowledgeSystemMessage(nextKnowledgeInfoEntries),
        );
    }

    /**
     * Gets human-readable titles for tool functions provided by this commitment.
     */
    getToolTitles(): Record<string_javascript_name, string> {
        return {
            knowledge_search: 'Knowledge search',
        };
    }

    /**
     * Gets KNOWLEDGE tool function implementations.
     */
    getToolFunctions(): Record<string_javascript_name, ToolFunction> {
        return createKnowledgeToolFunctions();
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
