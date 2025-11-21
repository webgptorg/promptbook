import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import type { string_knowledge_source_link } from '../../types/typeAliases';
import { isValidUrl } from '../../utils/validators/url/isValidUrl';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

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
    constructor() {
        super('KNOWLEDGE');
    }

    /**
     * Short one-line description of KNOWLEDGE.
     */
    get description(): string {
        return 'Add domain **knowledge** via direct text or external sources (RAG).';
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
            STYLE Present information in clear, academic format
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const trimmedContent = content.trim();

        if (!trimmedContent) {
            return requirements;
        }

        // Check if content is a URL (external knowledge source)
        if (isValidUrl(trimmedContent)) {
            // Store the URL for later async processing
            const updatedRequirements = {
                ...requirements,
                knowledgeSources: [
                    ...(requirements.knowledgeSources || []),
                    trimmedContent as string_knowledge_source_link,
                ],
            };

            // Add placeholder information about knowledge sources to system message
            const knowledgeInfo = `Knowledge Source URL: ${trimmedContent} (will be processed for retrieval during chat)`;

            return this.appendToSystemMessage(updatedRequirements, knowledgeInfo, '\n\n');
        } else {
            // Direct text knowledge - add to system message
            const knowledgeSection = `Knowledge: ${trimmedContent}`;
            return this.appendToSystemMessage(requirements, knowledgeSection, '\n\n');
        }
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
