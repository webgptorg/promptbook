import type { string_url } from '../../../types/typeAliases';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';
import type { AgentModelRequirements } from '../_misc/AgentModelRequirements';
import { FrontendRAGService } from './FrontendRAGService';

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
    private ragService: FrontendRAGService;

    constructor() {
        super('KNOWLEDGE');
        this.ragService = new FrontendRAGService();
    }

    /**
     * Markdown documentation for KNOWLEDGE commitment.
     */
    get description(): string {
        return [
            '# KNOWLEDGE',
            '',
            'Adds specific knowledge, facts, or context to the agent using a RAG (Retrieval-Augmented Generation) approach for external sources.',
            '',
            'Two modes:',
            '- Direct text knowledge: Appends a "Knowledge: ..." line to the system message.',
            '- URL knowledge source: Stores the URL in metadata.knowledgeSources and a ragService for retrieval at chat time, and appends an informational line to the system message.',
            '',
            'Metadata effects when URL is used:',
            '- metadata.ragService = FrontendRAGService instance',
            '- metadata.knowledgeSources += [url]',
            '',
            'Examples:',
            '```book',
            'KNOWLEDGE The company was founded in 2020 and specializes in AI-powered solutions',
            'KNOWLEDGE https://example.com/company-handbook.pdf',
            'KNOWLEDGE https://example.com/product-documentation.pdf',
            '```',
            '',
        ].join('\n');
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const trimmedContent = content.trim();

        if (!trimmedContent) {
            return requirements;
        }

        // Check if content is a URL (external knowledge source)
        if (this.isUrl(trimmedContent)) {
            // Store the URL for later async processing
            const updatedRequirements = {
                ...requirements,
                metadata: {
                    ...requirements.metadata,
                    ragService: this.ragService,
                    knowledgeSources: [
                        ...(requirements.metadata?.knowledgeSources || []),
                        trimmedContent as string_url,
                    ],
                },
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

    /**
     * Check if content is a URL
     */
    private isUrl(content: string): boolean {
        try {
            new URL(content);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get RAG service instance for retrieving context during chat
     */
    getRagService(): FrontendRAGService {
        return this.ragService;
    }
}

/**
 * Singleton instance of the KNOWLEDGE commitment definition
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export const KnowledgeCommitment = new KnowledgeCommitmentDefinition();

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
